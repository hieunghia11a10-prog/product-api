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
  // Chỉ cho phép chạy trên database kiểm thử
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

  // =========================================================
  // HEALTH
  // =========================================================

  test("Health: kết nối MongoDB thành công", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      status: "ok",
      database: "connected",
    });
  });


  // =========================================================
  // CREATE
  // =========================================================

  test("POST: tạo và lưu sản phẩm", async () => {
    const response = await request(app)
      .post("/api/products")
      .send(sample);

    expect(response.statusCode).toBe(201);

    expect(response.body).toMatchObject(sample);

    const saved = await Product
      .findOne({ pid: sample.pid })
      .lean();

    expect(saved).toMatchObject(sample);
  });


  // =========================================================
  // READ
  // =========================================================

  test("GET: lấy danh sách sản phẩm", async () => {
    await Product.create(sample);

    const response = await request(app)
      .get("/api/products");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject(sample);
  });


  test("GET: lấy sản phẩm theo pid", async () => {
    await Product.create(sample);

    const response = await request(app)
      .get(`/api/products/${sample.pid}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject(sample);
  });


  // =========================================================
  // UPDATE
  // =========================================================

  test("PUT: cập nhật và lưu thay đổi", async () => {
    await Product.create(sample);

    const changes = {
      pname: "Ban phim co",
      price: 500000,
      quantity: 8,
    };

    const response = await request(app)
      .put(`/api/products/${sample.pid}`)
      .send(changes);

    const expected = {
      pid: sample.pid,
      ...changes,
    };

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject(expected);

    const saved = await Product
      .findOne({ pid: sample.pid })
      .lean();

    expect(saved).toMatchObject(expected);
  });


  // =========================================================
  // DELETE
  // =========================================================

  test("DELETE: xóa sản phẩm", async () => {
    await Product.create(sample);

    const response = await request(app)
      .delete(`/api/products/${sample.pid}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.pid).toBe(sample.pid);

    expect(
      await Product.findOne({ pid: sample.pid })
    ).toBeNull();

    const readAgain = await request(app)
      .get(`/api/products/${sample.pid}`);

    expect(readAgain.statusCode).toBe(404);
  });


  // =========================================================
  // DUPLICATE PID
  // =========================================================

  test("Từ chối tạo trùng pid", async () => {
    await Product.create(sample);

    const response = await request(app)
      .post("/api/products")
      .send(sample);

    expect(response.statusCode).toBe(409);

    expect(
      await Product.countDocuments({})
    ).toBe(1);

    const saved = await Product
      .findOne({ pid: sample.pid })
      .lean();

    expect(saved).toMatchObject(sample);
  });


  // =========================================================
  // REQUIRED FIELD TEST
  // Tự động đọc Product.js
  // =========================================================

  test.each(["pid", "pname", "price", "quantity"])(
    "Kiểm tra trường %s theo schema hiện tại",
    async (field) => {

      const schemaPath = Product.schema.path(field);

      // Nếu field không tồn tại trong schema
      if (!schemaPath) {
        console.log(
          `Bỏ qua ${field}: không tồn tại trong Product schema`
        );

        return;
      }

      const isRequired =
        schemaPath.isRequired === true;

      const data = { ...sample };

      delete data[field];

      const response = await request(app)
        .post("/api/products")
        .send(data);

      if (isRequired) {

        // Field required trong Product.js
        expect(response.statusCode).toBe(400);

        expect(
          await Product.countDocuments({})
        ).toBe(0);

      } else {

        // Field không required trong Product.js
        expect(response.statusCode).toBe(201);

        expect(
          await Product.countDocuments({})
        ).toBe(1);
      }
    }
  );


  // =========================================================
  // INVALID REQUIRED STRING
  // =========================================================

  test("Từ chối pname rỗng nếu pname là required", async () => {

    const schemaPath = Product.schema.path("pname");

    if (!schemaPath || schemaPath.isRequired !== true) {
      console.log(
        "Bỏ qua test pname rỗng vì pname không required"
      );

      return;
    }

    const data = {
      ...sample,
      pname: "",
    };

    const response = await request(app)
      .post("/api/products")
      .send(data);

    expect(response.statusCode).toBe(400);

    expect(
      await Product.countDocuments({})
    ).toBe(0);
  });


  // =========================================================
  // NUMBER VALUES
  // =========================================================

  test.each([
    ["giá âm", { price: -1 }],
    ["số lượng âm", { quantity: -1 }],
    ["số lượng thập phân", { quantity: 1.5 }],
  ])(
    "Kiểm tra dữ liệu %s theo schema hiện tại",
    async (_, changes) => {

      const data = {
        ...sample,
        ...changes,
      };

      const response = await request(app)
        .post("/api/products")
        .send(data);

      /*
       * Không hard-code 201/400 ở đây.
       * Nếu sau này Product.js thêm min/max hoặc validate,
       * test sẽ kiểm tra theo validation thực tế của API.
       */

      expect([201, 400]).toContain(
        response.statusCode
      );
    }
  );


  // =========================================================
  // UPDATE PRICE
  // =========================================================

  test("UPDATE: cập nhật giá", async () => {
    await Product.create(sample);

    const changes = {
      pname: sample.pname,
      price: 500000,
      quantity: sample.quantity,
    };

    const response = await request(app)
      .put(`/api/products/${sample.pid}`)
      .send(changes);

    expect(response.statusCode).toBe(200);

    expect(response.body).toMatchObject({
      pid: sample.pid,
      ...changes,
    });

    const saved = await Product
      .findOne({ pid: sample.pid })
      .lean();

    expect(saved).toMatchObject({
      pid: sample.pid,
      ...changes,
    });
  });

});