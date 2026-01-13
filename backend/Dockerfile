# FROM node:18-slim

# # Install system dependencies including Tesseract OCR
# RUN apt-get update && apt-get install -y \
#     tesseract-ocr \
#     tesseract-ocr-eng \
#     tesseract-ocr-hin \
#     python3 \
#     python3-pip \
#     && rm -rf /var/lib/apt/lists/*

# # Set working directory
# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Install Node.js dependencies
# RUN npm install --production

# # Copy Python requirements and install
# COPY requirements.txt ./
# RUN pip3 install --no-cache-dir -r requirements.txt

# # Copy application code
# COPY . .

# # Expose port
# EXPOSE 10000

# # Start the application
# CMD ["node", "server.js"]

FROM node:18-slim

# Install system dependencies including Tesseract OCR and build tools
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    libpoppler-cpp-dev \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip3 install --upgrade pip setuptools wheel

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "server.js"]