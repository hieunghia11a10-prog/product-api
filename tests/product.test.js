const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const Product = require("../models/Product");

jest.setTimeout(30000);

const uri = process.env.MONGO_URI;
let databaseReady = false;

beforeAll(async () => {
  // Chỉ được dọn dữ liệu trong database kiểm thử.
  if (!uri || !uri.endsWith("/productdb_ci_test")) {
    throw new Error(
      "MONGO_URI phải trỏ đến database productdb_ci_test"
    );
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  await Product.init();
  databaseReady = true;
});

beforeEach(async () => {
  if (!databaseReady) {
    throw new Error("MongoDB kiểm thử chưa sẵn sàng");
  }

  await Product.deleteMany({});
});

afterAll(async () => {
  try {
    if (databaseReady) {
      await Product.deleteMany({});
    }
  } finally {
    await mongoose.disconnect();
  }
});

const sample = {
  pid: "CI001",
  pname: "Ban phim",
  price: 350000,
  quantity: 10,
};

describe("Product API với MongoDB thật", () => {
  test("Health trả về kết nối MongoDB thành công", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      database: "connected",
    });
  });

  test("CREATE: tạo sản phẩm và lưu vào MongoDB", async () => {
    const response = await request(app)
      .post("/api/products")
      .send(sample);

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject(sample);

    const saved = await Product.findOne({ pid: sample.pid }).lean();
    expect(saved).toMatchObject(sample);
  });

  test("READ: lấy danh sách sản phẩm", async () => {
    await Product.create(sample);

    const response = await request(app).get("/api/products");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject(sample);
  });

  test("READ: lấy sản phẩm theo pid", async () => {
    await Product.create(sample);

    const response = await request(app)
      .get(`/api/products/${sample.pid}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject(sample);
  });

  test("UPDATE: sửa sản phẩm và lưu thay đổi", async () => {
    await Product.create(sample);

    const changes = {
      pname: "Ban phim co",
      price: 500000,
      quantity: 8,
    };

    const response = await request(app)
      .put(`/api/products/${sample.pid}`)
      .send(changes);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      pid: sample.pid,
      ...changes,
    });

    const saved = await Product.findOne({ pid: sample.pid }).lean();

    expect(saved).toMatchObject({
      pid: sample.pid,
      ...changes,
    });
  });

  test("DELETE: xóa sản phẩm khỏi MongoDB", async () => {
    await Product.create(sample);

    const response = await request(app)
      .delete(`/api/products/${sample.pid}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.pid).toBe(sample.pid);

    const saved = await Product.findOne({ pid: sample.pid });
    expect(saved).toBeNull();

    const readAgain = await request(app)
      .get(`/api/products/${sample.pid}`);

    expect(readAgain.statusCode).toBe(404);
  });

  test("Không cho phép tạo trùng pid", async () => {
    await Product.create(sample);

    const response = await request(app)
      .post("/api/products")
      .send(sample);

    expect(response.statusCode).toBe(409);
    expect(await Product.countDocuments({})).toBe(1);

    const saved = await Product.findOne({ pid: sample.pid }).lean();
    expect(saved).toMatchObject(sample);
  });

  test.each([
    ["tên rỗng", { pname: "" }],
    ["giá âm", { price: -1 }],
    ["số lượng âm", { quantity: -1 }],
    ["số lượng thập phân", { quantity: 1.5 }],
  ])("Cho phép tạo sản phẩm có %s", async (_, changes) => {
    const data = { ...sample, ...changes };

    const response = await request(app)
      .post("/api/products")
      .send(data);

    expect(response.statusCode).toBe(201);
    expect(response.body).toMatchObject(data);
    expect(await Product.countDocuments({})).toBe(1);

    const saved = await Product.findOne({ pid: data.pid }).lean();
    expect(saved).toMatchObject(data);
  });

  test.each(["pid", "pname", "price", "quantity"])(
    "Cho phép tạo sản phẩm thiếu trường %s",
    async (field) => {
      const data = { ...sample };
      delete data[field];

      const response = await request(app)
        .post("/api/products")
        .send(data);

      expect(response.statusCode).toBe(201);
      expect(response.body).toMatchObject(data);
      expect(response.body).not.toHaveProperty(field);
      expect(await Product.countDocuments({})).toBe(1);

      const saved = await Product.findById(response.body._id).lean();
      expect(saved).toMatchObject(data);
      expect(saved).not.toHaveProperty(field);
    }
  );

  test("Cho phép tạo sản phẩm chỉ có pid", async () => {
    const response = await request(app)
      .post("/api/products")
      .send({ pid: "CI002" });

    expect(response.statusCode).toBe(201);

    const saved = await Product.findOne({ pid: "CI002" }).lean();

    expect(saved).not.toBeNull();
    expect(saved.pname).toBeUndefined();
    expect(saved.price).toBeUndefined();
    expect(saved.quantity).toBeUndefined();
  });

  test("Cho phép cập nhật giá âm và lưu thay đổi", async () => {
    await Product.create(sample);

    const response = await request(app)
      .put(`/api/products/${sample.pid}`)
      .send({ price: -1 });

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      ...sample,
      price: -1,
    });

    const saved = await Product.findOne({ pid: sample.pid }).lean();

    expect(saved).toMatchObject({
      ...sample,
      price: -1,
    });
  });
});