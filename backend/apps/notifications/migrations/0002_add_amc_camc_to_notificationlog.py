import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
        ('instruments', '0003_amc_camc_records'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificationlog',
            name='record_type',
            field=models.CharField(
                choices=[('calibration', 'Calibration'), ('amc', 'AMC'), ('camc', 'CAMC')],
                db_index=True,
                default='calibration',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='notificationlog',
            name='calibration_record',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='notification_logs',
                to='instruments.calibrationrecord',
            ),
        ),
        migrations.AddField(
            model_name='notificationlog',
            name='amc_record',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='notification_logs',
                to='instruments.amcrecord',
            ),
        ),
        migrations.AddField(
            model_name='notificationlog',
            name='camc_record',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='notification_logs',
                to='instruments.camcrecord',
            ),
        ),
    ]
