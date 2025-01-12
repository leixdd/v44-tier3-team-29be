import { Request, Response } from 'express'
import { UserModel, UserInfoModel } from '../models/UserSchema'
import { hash, compare } from 'bcrypt'
import { validate } from '../libs/Validation'
import { RULES } from '../libs/Rules'
import { IUser } from '@/models/contracts/IUser'
import { sign } from 'jsonwebtoken'
import { config } from 'dotenv'
const denv = config()

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password, confirm_password } = req.body

  //validation
  const emailRequired = validate('E-mail Address', RULES.REQUIRED, {
    value: email
  })

  if (!emailRequired.success) {
    res.status(400).json(emailRequired)
    return
  }

  const passwordRequired = validate('Password', RULES.REQUIRED, {
    value: password
  })

  if (!passwordRequired.success) {
    res.status(400).json(passwordRequired)
    return
  }

  const confirmPasswordRequired = validate('Confirm Password', RULES.REQUIRED, {
    value: confirm_password
  })

  if (!confirmPasswordRequired.success) {
    res.status(400).json(confirmPasswordRequired)
    return
  }

  const emailValid = validate('E-mail Address', RULES.EMAIL, {
    value: email
  })

  if (!emailValid.success) {
    res.status(400).json(emailValid)
    return
  }

  const passwordLength = validate('Password', RULES.PASSWORD_MIN_LENGTH, {
    value: password,
    min: '8'
  })

  if (!passwordLength.success) {
    res.status(400).json(passwordLength)
    return
  }

  const passwordIdentical = validate('Password', RULES.IDENTICAL, {
    value: password,
    otherfield: 'Confirm Password',
    othervalue: confirm_password
  })

  if (!passwordIdentical.success) {
    res.status(400).json(passwordIdentical)
    return
  }

  // Hashing password
  const hashed_password = await hash(password, 10)

  if (!hashed_password) throw new Error('Error while hashing password')

  //check if there is identical email
  const data = await UserModel.find({ email })
  if (data.length > 0) {
    res.status(400).json({
      message: 'E-mail address is already been used',
      status: false
    })
    return
  }

  //save to db
  await UserModel.create({
    email,
    password: hashed_password
  }).catch((err) => {
    res.status(500).json({
      message: 'Something went wrong',
      success: false
    })
    return
  })

  //response will be changed when discussed with the team
  res.status(200).json({
    message: 'User created successfully',
    success: true
  })
}

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  //check if account is existing

  const data: IUser | null = await UserModel.findOne({ email })
  if (!data) {
    res.status(400).json({
      message: 'Account does not exists',
      status: false
    })
    return
  }

  const user = data

  //check if password is correct
  const isPasswordValid = await compare(password, user.password)

  if (!isPasswordValid) {
    res.status(400).json({
      message: 'username or password is incorrect.',
      status: false
    })
    return
  }

  //generate a jwt token for authentication
  const token = sign(
    { id: user.id },
    process.env.PASSPORT_ACCESS_KEY ?? 'noSecret'
  )

  res.status(200).json({
    message: { token, id: user.id },
    success: true
  })
}
