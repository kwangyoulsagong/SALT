import { Response } from "express";

export class ResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message: string = "success",
    statusCode: number = 200
  ) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errors?: any
  ) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = "Created successfully"
  ) {
    return this.success(res, data, message, 201);
  }
}
