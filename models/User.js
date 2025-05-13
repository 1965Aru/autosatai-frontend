// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['manager', 'member'],
      required: true,
      default: 'member'
    },
    verified: {
      type: Boolean,
      default: false
    },
    otp: {
      type: String
    },
    otpExpiry: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// ── Pre-save hook: hash password if modified ─────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: generate a one-time password ────────────────────
UserSchema.methods.generateOTP = async function () {
  const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(otpPlain, salt);
  this.otpExpiry = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
  await this.save();
  return otpPlain;
};

// ── Instance method: verify an OTP ───────────────────────────────────
UserSchema.methods.verifyOTP = async function (otpPlain) {
  if (!this.otpExpiry || this.otpExpiry < new Date()) {
    return false;
  }
  return bcrypt.compare(otpPlain, this.otp);
};

// ── Instance method: compare a login password ────────────────────────
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;