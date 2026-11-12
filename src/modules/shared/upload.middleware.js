const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Mantém o arquivo em memória: ele só vai para o disco depois de otimizado
// pelo image.service, então nenhum original sem tratamento é gravado.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      const error = new Error("Formato inválido. Envie uma imagem JPEG, PNG ou WebP");
      error.code = "INVALID_TYPE";
      return cb(error);
    }

    cb(null, true);
  }
});

/**
 * Recebe um único arquivo no campo `fieldName` (multipart/form-data) e
 * traduz os erros do Multer em respostas HTTP. Reutilizado por auth e dishes.
 */
function uploadImage(fieldName = "image") {
  const single = upload.single(fieldName);

  return (req, res, next) => {
    single(req, res, (error) => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "A imagem deve ter no máximo 5 MB" });
        }

        if (error.code === "INVALID_TYPE") {
          return res.status(415).json({ error: error.message });
        }

        if (error instanceof multer.MulterError) {
          return res.status(400).json({ error: `Envie um único arquivo no campo "${fieldName}"` });
        }

        return res.status(400).json({ error: "Requisição de upload inválida" });
      }

      if (!req.file) {
        return res.status(400).json({ error: `Envie a imagem no campo "${fieldName}" (multipart/form-data)` });
      }

      next();
    });
  };
}

module.exports = { uploadImage, MAX_FILE_SIZE, ALLOWED_TYPES };
