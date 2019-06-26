const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { APP_SECRET, getUserId } = require('../utils');

async function signup(parent, args, context) {
  const password = await bcrypt.hash(args.password, 10);
  const user = await context.prisma.createUser({ ...args, password });
  const token = jwt.sign({ userId: user.id }, APP_SECRET);
  console.log(password, user, token);
  return {
    token,
    user,
  };
}

async function login(parent, { email, password }, { prisma }) {
  const user = await prisma.user({ email });
  if (!user) {
    throw new Error('User not found');
  }
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid password');
  }
  const token = jwt.sign({ userId: user.id }, APP_SECRET);
  return { token, user };
}

function post(parent, { url, description }, context) {
  const userId = getUserId(context);
  return context.prisma.createLink({
    url,
    description,
    postedBy: {
      connect: {
        id: userId,
      },
    },
  });
}

function updateLink(parent, { id, url, description }, { prisma }) {
  return prisma.updateLink({
    data: { url, description },
    where: { id },
  });
}

function deleteLink(parent, { id }, { prisma }) {
  return prisma.deleteLink({ id });
}

async function vote(parent, args, context, info) {
  const userId = getUserId(context);
  const hasVoted = await context.prisma.$exists.vote({
    user: { id: userId },
    link: { id: args.linkId },
  });
  if (hasVoted) {
    throw new Error(`Already voted for: ${args.linkId}`);
  }
  return context.prisma.createVote({
    user: { connect: { id: userId } },
    link: { connect: { id: args.linkId } },
  });
}

module.exports = {
  signup,
  login,
  post,
  updateLink,
  deleteLink,
  vote,
};