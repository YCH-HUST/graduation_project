"""
API Tests for 中医智能辅助诊疗系统

测试用例：
1. 登录测试（成功/失败）
2. 患者创建病例
3. 医生审核病例
"""
import json
import os
import tempfile
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from PIL import Image
import io

from apps.accounts.models import User
from apps.cases.models import Case


class LoginTestCase(TestCase):
    """登录接口测试"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testpatient',
            password='testpass123',
            role='patient'
        )
    
    def test_login_success(self):
        """测试正确用户名密码登录"""
        response = self.client.post('/auth/login/', {
            'username': 'testpatient',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('token', data)
        self.assertIn('role', data)
        self.assertIn('user', data)
        self.assertEqual(data['role'], 'patient')
        self.assertEqual(data['user']['username'], 'testpatient')
    
    def test_login_invalid_password(self):
        """测试错误密码登录失败"""
        response = self.client.post('/auth/login/', {
            'username': 'testpatient',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, 400)
    
    def test_login_invalid_username(self):
        """测试不存在的用户名登录失败"""
        response = self.client.post('/auth/login/', {
            'username': 'nonexistent',
            'password': 'somepassword'
        })
        
        self.assertEqual(response.status_code, 400)


class PatientCreateCaseTestCase(TestCase):
    """患者创建病例测试"""
    
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            username='testpatient',
            password='testpass123',
            role='patient'
        )
        # 登录获取 token
        response = self.client.post('/auth/login/', {
            'username': 'testpatient',
            'password': 'testpass123'
        })
        self.token = response.json()['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def _create_test_image(self):
        """创建测试用的图片文件"""
        img = Image.new('RGB', (100, 100), color='red')
        img_io = io.BytesIO()
        img.save(img_io, format='JPEG')
        img_io.seek(0)
        return SimpleUploadedFile(
            name='test_tongue.jpg',
            content=img_io.read(),
            content_type='image/jpeg'
        )
    
    def test_patient_create_case(self):
        """测试患者创建病例"""
        image = self._create_test_image()
        
        response = self.client.post('/api/cases/', {
            'raw_image': image,
            'chief_complaint_text': '头痛三天，伴有失眠',
            'questionnaire_json': json.dumps({'q1': 'answer1'})
        }, format='multipart')
        
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn('case_id', data)
        
        # 验证病例已创建
        case = Case.objects.get(pk=data['case_id'])
        self.assertEqual(case.patient, self.patient)
        self.assertEqual(case.status, 'draft')
        self.assertEqual(case.chief_complaint_text, '头痛三天，伴有失眠')
        
        # 验证资源已创建
        self.assertEqual(case.assets.filter(type='raw_image').count(), 1)
    
    def test_create_case_without_image(self):
        """测试缺少图片时创建失败"""
        response = self.client.post('/api/cases/', {
            'chief_complaint_text': '头痛三天',
        }, format='multipart')
        
        self.assertEqual(response.status_code, 400)


class DoctorReviewCaseTestCase(TestCase):
    """医生审核病例测试"""
    
    def setUp(self):
        self.client = APIClient()
        
        # 创建患者和医生
        self.patient = User.objects.create_user(
            username='testpatient',
            password='testpass123',
            role='patient'
        )
        self.doctor = User.objects.create_user(
            username='testdoctor',
            password='testpass123',
            role='doctor'
        )
        
        # 创建待审核病例
        self.case = Case.objects.create(
            patient=self.patient,
            status='pending_review',
            chief_complaint_text='测试主诉'
        )
        
        # 医生登录
        response = self.client.post('/auth/login/', {
            'username': 'testdoctor',
            'password': 'testpass123'
        })
        self.token = response.json()['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_doctor_approve_case(self):
        """测试医生通过病例"""
        response = self.client.post(f'/api/cases/{self.case.id}/review/', {
            'decision': 'approved',
            'edited_syndrome_json': {'syndrome': '肝郁气滞'},
            'edited_prescription_json': {'prescription': '逍遥散'},
            'note': '符合诊断标准'
        }, format='json')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['ok'])
        
        # 验证病例状态已更新
        self.case.refresh_from_db()
        self.assertEqual(self.case.status, 'approved')
        
        # 验证审核记录已创建
        self.assertEqual(self.case.reviews.count(), 1)
        review = self.case.reviews.first()
        self.assertEqual(review.doctor, self.doctor)
        self.assertEqual(review.decision, 'approved')
    
    def test_doctor_reject_case(self):
        """测试医生驳回病例"""
        response = self.client.post(f'/api/cases/{self.case.id}/review/', {
            'decision': 'rejected',
            'note': '信息不完整，需要补充'
        }, format='json')
        
        self.assertEqual(response.status_code, 200)
        
        self.case.refresh_from_db()
        self.assertEqual(self.case.status, 'rejected')
    
    def test_patient_cannot_review(self):
        """测试患者不能审核病例"""
        # 患者登录
        response = self.client.post('/auth/login/', {
            'username': 'testpatient',
            'password': 'testpass123'
        })
        patient_token = response.json()['token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {patient_token}')
        
        response = self.client.post(f'/api/cases/{self.case.id}/review/', {
            'decision': 'approved',
        }, format='json')
        
        self.assertEqual(response.status_code, 403)
