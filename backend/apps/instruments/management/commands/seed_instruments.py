from django.core.management.base import BaseCommand
from apps.instruments.models import Instrument, CalibrationRecord

INSTRUMENT_NAMES = [
    'Shimadzu GC-01 UOP 744',
    'Shimadzu GC-02 UOP 744',
    'SHIMADZU GC-03 UOP 744 & ASTM D7504',
    'Shimadzu GC-04 ASTM D7504',
    'Shimadzu GC SCD',
    'Shimadzu HPLC ASTM D7884',
    'Agilent HPLC ASTM D7884',
    'Agilent GC-01 UOP 621',
    'Agilent GC-02 UOP 690',
    'Agilent GC-03 UOP 720',
    'Agilent GC-04 UOP 798',
    'Agilent GC-05 UOP 744',
    'Agilent GC-06 UOP 744',
    'Agilent GC-07 UOP 831',
    'Agilent GC-08 ASTM D-6730 DHA PIONA',
    'Agilent GC-09 UOP 931',
    'Agilent GC-10',
    'Agilent GC-11 ASTM D-6730 DHA PIONA',
    'Agilent GC-12 UOP 744',
    'Agilent GC-13 INVISTA 1020',
    'Agilent GC-14 INVISTA 1020',
    'Agilent GC-15 INVISTA 1990',
    'Agilent GC-16 INVISTA 2210',
]

class Command(BaseCommand):
    help = 'Wipes existing instruments to reset serial numbers and seeds the database with the exact default list'

    def handle(self, *args, **kwargs):
        # 1. Hard delete all calibration records and instruments to reset the DB
        CalibrationRecord.objects.all().delete()
        Instrument.objects.all().delete()
        self.stdout.write(self.style.WARNING('Successfully wiped all existing instruments and calibration records to reset serial numbers.'))

        # 2. Seed the exact list starting from INST-0001
        added = 0
        for i, name in enumerate(INSTRUMENT_NAMES, start=1):
            serial_number = f'INST-{i:04d}'
            Instrument.objects.create(
                name=name,
                department='PX-PTA Lab',
                serial_number=serial_number
            )
            added += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {added} instruments perfectly starting from INST-0001.'))
