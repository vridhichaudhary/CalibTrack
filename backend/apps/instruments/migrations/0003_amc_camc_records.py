import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('instruments', '0002_allow_blank_serial_location'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AMCRecord',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('maintenance_on', models.DateField()),
                ('due_date', models.DateField(db_index=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('instrument', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='amc_records', to='instruments.instrument')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='amc_records_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'amc_records',
                'ordering': ['-due_date'],
            },
        ),
        migrations.CreateModel(
            name='CAMCRecord',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('maintenance_on', models.DateField()),
                ('due_date', models.DateField(db_index=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('instrument', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='camc_records', to='instruments.instrument')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='camc_records_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'camc_records',
                'ordering': ['-due_date'],
            },
        ),
    ]
