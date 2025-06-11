import { User } from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import bcrypt from "bcryptjs";
import createTokenAndSaveCookies from "../jwt/AuthToken.js";
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import fs from "fs";
import path from "path";


export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, role } = req.body;

    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    let photoPath = "";
    if (req.file) {
      photoPath = req.file.path.replace(/\\/g, "/").replace("public/", "");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      role,
      photo: photoPath,
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        photo: newUser.photo,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Please fill required fields" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    let token = await createTokenAndSaveCookies(user._id, res);
    res.status(200).json({
      message: "User logged in successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        photo: user.photo,
      },
      token: token,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("jwt");
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server error" });
  }
};

export const getMyProfile = async (req, res) => {
  const user = await req.user;
  res.status(200).json({ user });
};

export const getAdmins = async (req, res) => { 
  const admins = await User.find({ role: "admin" });
  res.status(200).json({ admins });
};

export const updateProfilePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      currentPassword,
      newPassword
    } = req.body;

    if (
      !req.file &&
      !firstName &&
      !lastName &&
      !phone &&
      !currentPassword &&
      !newPassword
    ) {
      return res
        .status(400)
        .json({ message: "No data provided for update" });
    }

    // Fetch user with password for verification
    const user = await User.findById(id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData = {};

    // Update firstName and lastName
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;

    // Update phone if it's not taken by another user
    if (phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser && existingUser._id.toString() !== id) {
        return res
          .status(400)
          .json({ message: "Phone number already exists" });
      }
      updateData.phone = phone;
    }

    // Handle profile photo update
    if (req.file) {
      if (user.photo) {
        const oldPhotoPath = path.join("public", user.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      updateData.photo = req.file.path
        .replace(/\\/g, "/")
        .replace("public/", "");
    }

    // Handle password update
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    } else if (currentPassword || newPassword) {
      return res.status(400).json({
        message:
          "Both current and new passwords are required to update password",
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};



export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ status: "User not found" });
        }

        // Generate JWT Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "2m" });

        // Configure nodemailer
        var transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
             tls: {
    rejectUnauthorized: false,
  },
        });

        var mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email, // Send email to the actual user
            subject: "Reset Password Link",
            text: `${process.env.FRONTEND_URI}/reset_password/${user._id}/${token}`,
        };

        // Send email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Nodemailer sendMail error:", error); // Log full error for debugging
                return res.status(500).json({ status: "Email not sent" });
            } else {
                return res.json({ status: "Success", message: "Reset link sent to your email" });
            }
        });
    } catch (error) {
        res.status(500).json({ status: "Error", message: "Internal Server Error" });
    }
};




export const resetPassword = async (req, res) => {
  try {
      const { id, token } = req.params;
      const { password } = req.body;

      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
          if (err) {
              return res.status(400).json({ Status: "Error with token" });
          }

          const hashedPassword = await bcrypt.hash(password, 10);

          const user = await User.findByIdAndUpdate(id, { password: hashedPassword });

          if (!user) {
              return res.status(404).json({ Status: "User not found" });
          }

          res.json({ Status: "Success" });
      });
  } catch (error) {
      res.status(500).json({ Status: "Internal Server Error", Error: error.message });
  }
};

