#!/usr/bin/env python3
"""Live nginx (certbot SSL) uchun /platform route va admin redirect."""
from pathlib import Path
import re

path = Path("/etc/nginx/sites-enabled/cleanway")
text = path.read_text()
marker = "# PLATFORM_LOCATION_MERCHANT"

if marker not in text:
    text = text.replace(
        "    server_name cleanway.4mi.uz;\n\n    location / {",
        f"""    server_name cleanway.4mi.uz;

    {marker}
    location /platform {{
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }}

    location / {{""",
        1,
    )

admin_ssl = re.search(
    r"# Platform admin \(merchant\)\s+server \{\s+server_name admin\.cleanway\.4mi\.uz;.*?\n\}",
    text,
    re.S,
)
if admin_ssl and "return 301 https://cleanway.4mi.uz/platform" not in admin_ssl.group(0):
    new_admin = """# Platform admin (merchant)
server {
    server_name admin.cleanway.4mi.uz;
    return 301 https://cleanway.4mi.uz/platform$request_uri;

    listen 443 ssl; # managed by Certbot
    listen [::]:443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/cleanway.4mi.uz/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/cleanway.4mi.uz/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}"""
    text = text[: admin_ssl.start()] + new_admin + text[admin_ssl.end() :]

path.write_text(text)
print("nginx config yangilandi")
