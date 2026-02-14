#!/bin/sh
set -e
# Seeds idempotentes: si fallan por archivo ausente, no romper arranque en dev sin docs montado
python -c "
from pathlib import Path
import os
try:
    from app.services.seed_profile import run_seed
    p = os.environ.get('PROFILE_JSON_PATH')
    run_seed(Path(p) if p else None)
except Exception as e:
    print('Warning: seed_profile failed:', e)
try:
    from app.services.seed_template import run_seed as run_tmpl
    p = os.environ.get('TEMPLATE_TEX_PATH')
    run_tmpl(Path(p) if p else None)
except Exception as e:
    print('Warning: seed_template failed:', e)
"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
