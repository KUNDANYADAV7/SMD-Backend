// import multer from "multer";
// import path from "path";
// import fs from "fs";

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const folder = req.folder || "public/menservice"; // Default folder if not specified
//     if (!fs.existsSync(folder)) {
//       fs.mkdirSync(folder, { recursive: true }); // Ensure folder exists
//     }
//     cb(null, folder);
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// // Middleware function to set destination folder dynamically
// export const setUploadFolder = (folderName) => (req, res, next) => {
//   req.folder = `public/${folderName}`;
//   next();
// };

// export const upload = multer({ storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // ✅ Allow up to 10 MB
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only image files are allowed!"), false);
//     }
//   },
//  });





import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.folder || "public/menservice"; // Default folder if not specified
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true }); // Ensure folder exists
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Middleware to set dynamic upload folder
export const setUploadFolder = (folderName) => (req, res, next) => {
  req.folder = `public/${folderName}`;
  next();
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // ✅ Allow up to 10 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});
