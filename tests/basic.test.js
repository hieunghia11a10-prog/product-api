const request = require("supertest");
const app = require("../app");

describe("Product API - Basic CI", () => {
  test("Đường dẫn không tồn tại trả về 404", async () => {
    const response = await request(app).get("/not-found");

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      message: "Đường dẫn không tồn tại",
    });
  });
});