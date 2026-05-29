const User = require("../models/User");
const config = require("../config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token" });
    const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
    const newAccess = jwt.sign({ id: decoded.id }, config.JWT_SECRET, { expiresIn: "15m" });
    res.json({ token: newAccess });
  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const accessToken = jwt.sign({ id: user._id }, config.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user._id }, config.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // set true in production (HTTPS)
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
      message: "User registered successfully",
      token: accessToken,
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login existing user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const accessToken = jwt.sign({ id: existingUser._id }, config.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: existingUser._id }, config.JWT_REFRESH_SECRET, { expiresIn: "7d" });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // set true in production
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({
      message: "Login successful",
      token: accessToken,
      user: { _id: existingUser._id, name: existingUser.name, email: existingUser.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
