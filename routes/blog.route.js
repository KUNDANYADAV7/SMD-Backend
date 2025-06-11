import express from "express";
import {
  createBlog,
  deleteBlog,
  getAllBlogs,
  getMyBlogs,
  getSingleBlogs,
  updateBlog,
} from "../controller/blog.controller.js";
import { isAdmin, isAuthenticated } from "../middleware/authUser.js";
import { upload, setUploadFolder } from "../middleware/Multer.js";

const router = express.Router();

router.post("/create", isAuthenticated, isAdmin("admin"),setUploadFolder("blogImages"), upload.single("blogImage"), createBlog);
router.delete("/delete/:id", isAuthenticated, isAdmin("admin"), deleteBlog);
router.get("/all-blogs", getAllBlogs);
// router.get("/single-blog/:id", isAuthenticated, getSingleBlogs);
router.get("/single-blog/slug/:slug", isAuthenticated, getSingleBlogs);
router.get("/my-blog", isAuthenticated, isAdmin("admin"), getMyBlogs);
router.put("/update/:id", isAuthenticated, isAdmin("admin"),setUploadFolder("blogImages"), upload.single("blogImage"), updateBlog);


router.get("/single-blogs/slug/:slug", getSingleBlogs);

export default router;
