import bcrypt from "bcrypt";
import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
const User = require("../../models/userModel.js");

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const secret = process.env.JWT_SECRET_KEY;
    if (!secret) throw new Error("JWT_SECRET_KEY is not defined in .env");

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        email: user.email,
      },
      secret,
      { expiresIn: "30d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    console.log("Login successful", user);
    res.status(200).json({
      message: "Login successful",
      body: {
        _id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        email: user.email,
        token,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
