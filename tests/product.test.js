const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const Product = require("../models/Product");

jest.setTimeout(30000);

const uri = process.env.MONGO_URI;
let databaseReady = false;

const sample = {
  pid: "CI001",
  pname: "Ban phim",
  price: 350000,
  quantity: 10,
};

beforeAll(async () => {
  // Bảo vệ dữ liệu: chỉ chạy trên database kiểm thử.
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

describe("Product API với MongoDB thật", () => {
  test("Health: kết nối MongoDB thành công", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      database: "connected",
    });
  });

  test("CREATE: tạo và lưu sản phẩm", async () => {
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

  test("UPDATE: cập nhật và lưu thay đổi", async () => {
    await Product.create(sample);

    // PUT hiện tại yêu cầu đủ ba trường.
    const changes = {
      pname: "Ban phim co",
      price: 500000,
      quantity: 8,
    };

    const response = await request(app)
      .put(`/api/products/${sample.pid}`)
      .send(changes);

    const expected = { pid: sample.pid, ...changes };

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject(expected);

    const saved = await Product.findOne({ pid: sample.pid }).lean();
    expect(saved).toMatchObject(expected);
  });

  test("DELETE: xóa sản phẩm", async () => {
    await Product.create(sample);

    const response = await request(app)
      .delete(`/api/products/${sample.pid}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.pid).toBe(sample.pid);
    expect(await Product.findOne({ pid: sample.pid })).toBeNull();

    const readAgain = await request(app)
      .get(`/api/products/${sample.pid}`);

    expect(readAgain.statusCode).toBe(404);
  });

  test("Từ chối tạo trùng pid", async () => {
    await Product.create(sample);

    const response = await request(app)
      .post("/api/products")
      .send(sample);

    expect(response.statusCode).toBe(409);
    expect(await Product.countDocuments({})).toBe(1);

    const saved = await Product.findOne({ pid: sample.pid }).lean();
    expect(saved).toMatchObject(sample);
  });

  // Theo schema hiện tại: pid, price, quantity không bắt buộc.
  test.each(["pid", "price", "quantity"])(
    "Cho phép thiếu trường %s",
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

  // pname là trường bắt buộc.
  test.each([
    ["tên rỗng", { ...sample, pname: "" }],
    [
      "thiếu pname",
      { pid: "CI002", price: 100, quantity: 2 },
    ],
    ["chỉ có pid", { pid: "CI003" }],
  ])("Từ chối tạo sản phẩm: %s", async (_, data) => {
    const response = await request(app)
      .post("/api/products")
      .send(data);

    expect(response.statusCode).toBe(400);
    expect(await Product.countDocuments({})).toBe(0);
  });

  // Schema không giới hạn số âm hoặc số thập phân.
  test.each([
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

  test("Cho phép cập nhật giá âm", async () => {
    await Product.create(sample);

    const changes = {
      pname: sample.pname,
      price: -1,
      quantity: sample.quantity,
    };

    const response = await request(app)
      .put(`/api/products/${sample.pid}`)
      .send(changes);

    const expected = { pid: sample.pid, ...changes };

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject(expected);

    const saved = await Product.findOne({ pid: sample.pid }).lean();
    expect(saved).toMatchObject(expected);
  });
});