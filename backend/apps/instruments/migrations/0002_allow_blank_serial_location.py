from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Make serial_number and location blank-able so the backend can auto-generate
    the serial number and the frontend no longer needs to supply location.
    """

    dependencies = [
        ('instruments', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='instrument',
            name='serial_number',
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=100,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name='instrument',
            name='location',
            field=models.CharField(
                blank=True,
                default='',
                max_length=255,
            ),
        ),
    ]
