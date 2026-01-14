"""
YOLO 舌象检测视图
使用 YOLOv11 模型进行舌象检测，返回标注后的图像和检测结果
"""
import os
import base64
from io import BytesIO

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from PIL import Image
import cv2
import numpy as np


# 类别映射
CLASS_NAMES = {
    0: "黑苔",
    1: "地图舌",
    2: "紫苔",
    3: "红舌黄厚腻苔",
    4: "红舌厚腻苔",
    5: "白舌厚腻苔",
}

# 颜色映射 (BGR 格式)
CLASS_COLORS = {
    0: (50, 50, 50),      # 黑苔 - 深灰色
    1: (0, 165, 255),     # 地图舌 - 橙色
    2: (255, 0, 128),     # 紫苔 - 紫色
    3: (0, 255, 255),     # 红舌黄厚腻苔 - 黄色
    4: (0, 0, 255),       # 红舌厚腻苔 - 红色
    5: (255, 255, 255),   # 白舌厚腻苔 - 白色
}

# 全局模型实例（懒加载）
_yolo_model = None


def get_yolo_model():
    """
    获取 YOLO 模型实例（懒加载单例）
    """
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            model_path = os.path.join(settings.BASE_DIR, 'models', 'yolo', 'best.pt')
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model not found: {model_path}")
            _yolo_model = YOLO(model_path)
            print(f"YOLO model loaded from {model_path}")
        except Exception as e:
            print(f"Failed to load YOLO model: {e}")
            raise
    return _yolo_model


def draw_detections(image: np.ndarray, detections: list) -> np.ndarray:
    """
    在图像上绘制检测框和标签（支持中文）

    Args:
        image: BGR 格式的图像
        detections: 检测结果列表

    Returns:
        标注后的图像
    """
    from PIL import Image, ImageDraw, ImageFont
    
    # 将 OpenCV 图像转换为 PIL 图像
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(image_rgb)
    draw = ImageDraw.Draw(pil_image)
    
    # 尝试加载中文字体，如果失败则使用默认字体
    font = None
    font_size = 20
    
    # macOS 常用中文字体路径
    font_paths = [
        '/System/Library/Fonts/PingFang.ttc',  # macOS PingFang
        '/System/Library/Fonts/STHeiti Medium.ttc',  # macOS Heiti
        '/System/Library/Fonts/Hiragino Sans GB.ttc',  # macOS Hiragino
        '/Library/Fonts/Arial Unicode.ttf',  # Arial Unicode
        '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',  # Linux WenQuanYi
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',  # Linux Noto
        'C:/Windows/Fonts/msyh.ttc',  # Windows 微软雅黑
        'C:/Windows/Fonts/simsun.ttc',  # Windows 宋体
    ]
    
    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                font = ImageFont.truetype(font_path, font_size)
                break
            except Exception:
                continue
    
    if font is None:
        # 如果没有找到中文字体，使用默认字体
        font = ImageFont.load_default()
    
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        class_id = det['class_id']
        class_name = det['class_name']
        confidence = det['confidence']
        
        # 获取颜色 (RGB 格式)
        bgr_color = CLASS_COLORS.get(class_id, (0, 255, 0))
        rgb_color = (bgr_color[2], bgr_color[1], bgr_color[0])  # BGR -> RGB
        
        # 绘制边界框
        draw.rectangle([x1, y1, x2, y2], outline=rgb_color, width=3)
        
        # 准备标签文本
        label = f"{class_name} {confidence:.1%}"
        
        # 获取文本边界框
        text_bbox = draw.textbbox((0, 0), label, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        text_height = text_bbox[3] - text_bbox[1]
        
        # 绘制标签背景（在边界框内部左上角）
        label_bg = [x1, y1, x1 + text_width + 10, y1 + text_height + 8]
        draw.rectangle(label_bg, fill=rgb_color)
        
        # 绘制标签文本（黑色）
        draw.text((x1 + 5, y1 + 2), label, fill=(0, 0, 0), font=font)
    
    # 将 PIL 图像转换回 OpenCV 格式
    result = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    return result


class YoloDetectView(APIView):
    """
    YOLO 舌象检测 API

    POST /api/yolo/detect/
    上传舌象图片，返回检测结果和标注后的图像
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        执行 YOLO 检测

        请求格式: multipart/form-data
        参数:
            - image: 舌象图片文件

        返回:
            - success: 是否成功
            - detections: 检测结果列表
            - annotated_image: Base64 编码的标注图像
        """
        # 检查是否上传了图片
        if 'image' not in request.FILES:
            return Response(
                {'detail': '请上传图片', 'success': False},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        
        try:
            # 读取图片
            image_bytes = image_file.read()
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return Response(
                    {'detail': '无法读取图片', 'success': False},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 加载模型并执行推理
            model = get_yolo_model()
            results = model(image)
            
            # 解析检测结果
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for i in range(len(boxes)):
                        box = boxes[i]
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                        confidence = float(box.conf[0])
                        class_id = int(box.cls[0])
                        class_name = CLASS_NAMES.get(class_id, f"类别{class_id}")
                        
                        detections.append({
                            'class_id': class_id,
                            'class_name': class_name,
                            'confidence': confidence,
                            'bbox': [x1, y1, x2, y2],
                        })
            
            # 绘制检测框
            annotated_image = draw_detections(image, detections)
            
            # 转换为 Base64
            _, buffer = cv2.imencode('.jpg', annotated_image, [cv2.IMWRITE_JPEG_QUALITY, 90])
            base64_image = base64.b64encode(buffer).decode('utf-8')
            
            return Response({
                'success': True,
                'detections': detections,
                'annotated_image': f'data:image/jpeg;base64,{base64_image}',
            })
            
        except FileNotFoundError as e:
            return Response(
                {'detail': str(e), 'success': False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            print(f"YOLO detection error: {e}")
            return Response(
                {'detail': f'检测失败: {str(e)}', 'success': False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
