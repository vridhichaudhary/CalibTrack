import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.forms.models import model_to_dict
from .models import Instrument, CalibrationRecord
from apps.audit.models import AuditLog

logger = logging.getLogger(__name__)

_audit_old_values = {}


import uuid

def serialize_model(instance):
    """
    Converts a model instance to a JSON-serializable dict.
    Converts UUID and date fields to strings.
    Used to capture old and new values for the audit log.
    """
    try:
        data = {}
        for field in instance._meta.fields:
            value = field.value_from_object(instance)
            if hasattr(value, 'isoformat'):
                value = value.isoformat()
            elif isinstance(value, uuid.UUID) or hasattr(value, 'hex'):
                value = str(value)
            data[field.name] = value
        return data
    except Exception as e:
        logger.error(f"Error serializing model for audit: {e}")
        return {}


@receiver(pre_save, sender=Instrument)
def capture_instrument_old_values(sender, instance, **kwargs):
    """
    Before saving an instrument, capture the current state
    from the database so we can store old_values in the audit log.
    Skips for new instances that don't exist in DB yet.
    """
    if instance.pk:
        try:
            old_instance = Instrument.objects.get(pk=instance.pk)
            _audit_old_values[str(instance.pk)] = serialize_model(old_instance)
        except Instrument.DoesNotExist:
            pass


@receiver(post_save, sender=Instrument)
def log_instrument_change(sender, instance, created, **kwargs):
    """
    After saving an instrument, write to the AuditLog.
    Determines action (CREATE vs UPDATE vs DELETE/RESTORE)
    by checking is_deleted flag and the created boolean.
    """
    try:
        old_values = _audit_old_values.pop(str(instance.pk), None)

        if created:
            action = 'CREATE'
            old_values = None
        elif instance.is_deleted:
            action = 'DELETE'
        elif old_values and old_values.get('is_deleted') and not instance.is_deleted:
            action = 'RESTORE'
        else:
            action = 'UPDATE'

        from core.middleware import get_current_request, get_client_ip

        request = get_current_request()
        changed_by = None
        ip_address = None

        if request and hasattr(request, 'user') and request.user.is_authenticated:
            changed_by = request.user
            ip_address = get_client_ip(request)

        AuditLog.objects.create(
            instrument=instance,
            changed_by=changed_by,
            action=action,
            table_name='instruments',
            record_id=str(instance.pk),
            old_values=old_values,
            new_values=serialize_model(instance),
            ip_address=ip_address,
        )

    except Exception as e:
        logger.error(f"Failed to write audit log for instrument {instance.pk}: {e}")


@receiver(post_save, sender=CalibrationRecord)
def log_calibration_record_change(sender, instance, created, **kwargs):
    """
    After saving a CalibrationRecord, write to the AuditLog.
    Always logs CREATE or UPDATE for full traceability.
    In an industrial environment, every calibration entry
    must be traceable.
    """
    try:
        action = 'CREATE' if created else 'UPDATE'
        from core.middleware import get_current_request, get_client_ip

        request = get_current_request()
        changed_by = None
        ip_address = None

        if request and hasattr(request, 'user') and request.user.is_authenticated:
            changed_by = request.user
            ip_address = get_client_ip(request)

        AuditLog.objects.create(
            instrument=instance.instrument,
            changed_by=changed_by,
            action=action,
            table_name='calibration_records',
            record_id=str(instance.pk),
            new_values={
                'instrument_id': str(instance.instrument.pk),
                'calibrated_on': str(instance.calibrated_on),
                'calibration_due_date': str(instance.calibration_due_date),
                'notes': instance.notes,
                'created_by': str(instance.created_by.username) if instance.created_by else None,
            },
            ip_address=ip_address,
        )
    except Exception as e:
        logger.error(
            f"Failed to write audit log for calibration record {instance.pk}: {e}"
        )
