import uuid

def generate_uuid_filename(filename):
    ext = filename.split('.')[-1]
    return f"{uuid.uuid4().hex}.{ext}"
