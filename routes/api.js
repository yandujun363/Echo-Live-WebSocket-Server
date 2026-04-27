import { Router } from "express";
import path from "path";
import logger from "../logger.js";
import config from "../config.js";
import {
  saveJsonFile,
  saveJsFile,
  ensureDirectoryExists,
} from "../utils/file.js";

const router = Router();

router.post(config.saveEndpoint, async (req, res) => {
  logger.debug(`处理API请求: ${req.method} ${req.originalUrl}`);
  logger.debug(`请求体内容: ${JSON.stringify(req.body)}`);

  const { name, root, data, type } = req.body;

  if (!name || !root || !data || !type) {
    const errorMsg =
      "保存配置失败: 请求体缺少必要字段 (需要 name, root, data, type)";
    logger.debug(`验证失败: ${errorMsg}`);
    return res.status(400).json({
      success: false,
      error: errorMsg,
    });
  }

  if (type !== "json" && type !== "js") {
    const errorMsg = '保存配置失败: type 字段必须是 "json" 或 "js"';
    logger.debug(`验证失败: ${errorMsg}`);
    return res.status(400).json({
      success: false,
      error: errorMsg,
    });
  }

  try {
    await ensureDirectoryExists(root);

    let fileName = name;
    if (type === "json" && !fileName.endsWith(".json")) {
      fileName = fileName + ".json";
    } else if (type === "js" && !fileName.endsWith(".js")) {
      fileName = fileName + ".js";
    }

    const filePath = path.join(root, fileName);

    if (type === "json") {
      await saveJsonFile(filePath, data);
    } else if (type === "js") {
      await saveJsFile(filePath, data);
    }

    const response = {
      success: true,
      message: type === "json" ? "JSON配置文件保存成功" : "JS文件保存成功",
      path: filePath,
      type: type,
      filename: fileName,
    };

    res.json(response);
    logger.debug(`发送成功响应: ${JSON.stringify(response)}`);
  } catch (error) {
    const errorResponse = {
      success: false,
      error: error.message,
    };
    res.status(500).json(errorResponse);
    logger.debug(`发送错误响应: ${JSON.stringify(errorResponse)}`);
  }
});

export { router as apiRoutes };