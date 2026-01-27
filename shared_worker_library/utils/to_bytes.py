def to_bytes(val):
    if isinstance(val, memoryview):
        return bytes(val)
    if isinstance(val, str) and val.startswith("\\x"):
        return bytes.fromhex(val[2:])
    return val