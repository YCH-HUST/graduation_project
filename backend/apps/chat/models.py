from django.db import models
from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
import time

class ChatMessage(models.Model):
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_messages',
        verbose_name='所属患者'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        verbose_name='发送者'
    )
    content = models.TextField(verbose_name='消息内容')
    is_read = models.BooleanField(default=False, verbose_name='是否已读')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '聊天记录'
        verbose_name_plural = '聊天记录'
        ordering = ['created_at']
        db_table = 'chat_message'

    def __str__(self):
        return f"{self.patient.username} - {self.sender.username}: {self.content[:20]}"

@receiver(post_save, sender=ChatMessage)
@receiver(post_delete, sender=ChatMessage)
def update_chat_cache(sender, instance, **kwargs):
    cache_key = f'chat_update_{instance.patient_id}'
    cache.set(cache_key, time.time(), timeout=None)
    
    # Global updates for unread count badges
    if hasattr(instance.sender, 'role') and instance.sender.role == 'patient':
        cache.set('global_chat_update_doctors', time.time(), timeout=None)
    else:
        cache.set(f'global_chat_update_patient_{instance.patient_id}', time.time(), timeout=None)
