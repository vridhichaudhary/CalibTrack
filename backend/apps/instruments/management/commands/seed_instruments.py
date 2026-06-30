from django.core.management.base import BaseCommand
from apps.instruments.models import Instrument, _next_serial_number

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
    'Agilent GC-04 UOP',
    'Agilent GC SCD',
    'Perkin Elmer GC',
    'Varian GC',
    'Bruker NMR',
    'Mettler Toledo Balance',
    'Sartorius Balance',
    'Fluke Multimeter',
    'Agilent UV-Vis Spectrophotometer',
    'Shimadzu UV-Vis Spectrophotometer',
    'Anton Paar Density Meter',
    'Viscometer',
    'Flash Point Tester',
]

class Command(BaseCommand):
    help = 'Seeds the database with default instruments if they do not exist'

    def handle(self, *args, **kwargs):
        added = 0
        for name in INSTRUMENT_NAMES:
            if not Instrument.objects.filter(name=name, is_deleted=False).exists():
                Instrument.objects.create(
                    name=name,
                    department='PX-PTA Lab',
                    serial_number=_next_serial_number()
                )
                added += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {added} instruments.'))
