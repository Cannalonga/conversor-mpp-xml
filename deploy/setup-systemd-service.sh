#!/bin/bash

cat > /etc/systemd/system/cannaconvert.service << 'SERVICEOF'
[Unit]
Description=CannaConvert Application
After=network.target
Wants=cannaconvert-restart.timer

[Service]
Type=simple
User=root
WorkingDirectory=/opt/cannaconvert
Environment="NODE_ENV=production"
Environment="NODE_OPTIONS=--max-old-space-size=256"
ExecStart=/usr/bin/node api/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
KillMode=mixed
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
SERVICEOF

cat > /etc/systemd/system/cannaconvert-restart.timer << 'TIMERF'
[Unit]
Description=Restart CannaConvert every 6 hours
Requires=cannaconvert-restart.service

[Timer]
OnBootSec=6h
OnUnitActiveSec=6h
AccuracySec=1s

[Install]
WantedBy=timers.target
TIMERF

cat > /etc/systemd/system/cannaconvert-restart.service << 'RESTARTF'
[Unit]
Description=Restart CannaConvert service
After=cannaconvert.service

[Service]
Type=oneshot
ExecStart=/bin/systemctl restart cannaconvert.service
StandardOutput=journal
StandardError=journal
RESTARTF

systemctl daemon-reload
systemctl enable cannaconvert.service
systemctl enable cannaconvert-restart.timer
systemctl start cannaconvert-restart.timer
systemctl restart cannaconvert.service

echo "Aplicacao configurada com:"
echo "- Limite de memoria: 256MB"
echo "- Restart automatico a cada 6 horas"
echo "- Restart manual se falhar"
echo ""
systemctl status cannaconvert.service
