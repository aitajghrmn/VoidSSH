FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV FLASK_APP=wsgi.py

EXPOSE 5000

# Invoked via `sh` rather than relying on the executable bit: the dev compose
# override bind-mounts the host ./backend directory over /app, and a
# checked-out file's mode (not the image's RUN chmod) wins once that happens.
ENTRYPOINT ["sh", "entrypoint.sh"]
CMD ["python", "wsgi.py"]
