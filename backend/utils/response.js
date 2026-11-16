/**
 * Standard API Response Utility
 */
exports.success = (res, data = [], message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

exports.error = (res, message = "Internal Server Error", statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
  };
  if (error && process.env.NODE_ENV !== "production") {
    response.stack = error.stack;
  }
  return res.status(statusCode).json(response);
};

exports.paginated = (res, rows = [], count = 0, page = 1, limit = 10, message = "Success") => {
  return res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: Number(page),
      pages: Math.ceil(count / limit),
      limit: Number(limit),
    },
    message,
  });
};
