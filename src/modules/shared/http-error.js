// Erro de regra de negócio com o status HTTP que o controller deve devolver.
// Os services lançam HttpError; o controller traduz para a resposta.
class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Responde com o status do HttpError ou 500 (sem expor detalhes internos).
function sendError(res, error, context) {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(`Erro ao ${context}:`, error.message);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

// Converte um parâmetro de rota em id inteiro positivo ou lança 400.
function parseId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(400, "Identificador inválido");
  }

  return id;
}

module.exports = { HttpError, sendError, parseId };
