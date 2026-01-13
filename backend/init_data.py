#!/usr/bin/env python
"""
初始化脚本：创建三个测试用户（patient、doctor、admin）
运行方式：python init_data.py
"""
import os
import sys
import django

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from apps.accounts.models import User


def create_users():
    """创建测试用户"""
    users_data = [
        {
            'username': 'patient',
            'password': 'patient123',
            'email': 'patient@example.com',
            'role': 'patient',
        },
        {
            'username': 'doctor',
            'password': 'doctor123',
            'email': 'doctor@example.com',
            'role': 'doctor',
        },
        {
            'username': 'admin',
            'password': 'admin123',
            'email': 'admin@example.com',
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True,
        },
    ]
    
    for user_data in users_data:
        username = user_data['username']
        if User.objects.filter(username=username).exists():
            print(f"用户 '{username}' 已存在，跳过创建")
            continue
        
        password = user_data.pop('password')
        user = User.objects.create(**user_data)
        user.set_password(password)
        user.save()
        print(f"创建用户成功: {username} (角色: {user.role})")


def main():
    print("=" * 50)
    print("中医智能辅助诊疗系统 - 初始化数据")
    print("=" * 50)
    print()
    
    create_users()
    
    print()
    print("=" * 50)
    print("初始化完成！")
    print()
    print("可用的测试账号：")
    print("  - 患者: patient / patient123")
    print("  - 医生: doctor / doctor123")
    print("  - 管理员: admin / admin123")
    print("=" * 50)


if __name__ == '__main__':
    main()
