const { v2: cloudinary } = require("cloudinary");

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dgnqkzqbo",
    api_key: process.env.CLOUDINARY_API_KEY || "616249661174858",
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metodo nao permitido." });
  }

  if (!process.env.CLOUDINARY_API_SECRET && !process.env.CLOUDINARY_URL) {
    return json(500, {
      error: "Configure CLOUDINARY_API_SECRET ou CLOUDINARY_URL nas variaveis de ambiente.",
    });
  }

  try {
    const body = JSON.parse(event.body || "{}");

    if (!body.image || !body.image.startsWith("data:image/")) {
      return json(400, { error: "Envie uma imagem valida." });
    }

    const uploadResult = await cloudinary.uploader.upload(body.image, {
      folder: "memorias",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      context: {
        source: "constelacao-de-nos",
        original_filename: body.fileName || "memoria",
      },
      transformation: [
        {
          fetch_format: "auto",
          quality: "auto",
        },
      ],
    });

    return json(200, {
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
    });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Nao foi possivel enviar a imagem para o Cloudinary." });
  }
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}
