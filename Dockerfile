# Sử dụng môi trường Node.js chính thức
FROM node:18-alpine

# Thiết lập thư mục làm việc trong Container
WORKDIR /app

# Copy file quản lý gói phụ thuộc
COPY package*.json ./

# Cài đặt phụ thuộc
RUN npm install

# Copy toàn bộ mã nguồn vào Container
COPY . .

# Mở cổng 3000
EXPOSE 3000

# Lệnh khởi chạy ứng dụng
CMD ["npm", "start"]