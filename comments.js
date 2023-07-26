// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Use middlewares
app.use(bodyParser.json());
app.use(cors());

// Comments object
const commentsByPostId = {};

// Get all comments
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create new comment
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id
  const commentId = randomBytes(4).toString('hex');
  // Get the content from the request body
  const { content } = req.body;
  // Get the comments from the commentsByPostId object
  const comments = commentsByPostId[req.params.id] || [];
  // Push the new comment into the comments object
  comments.push({ id: commentId, content, status: 'pending' });
  // Set the comments object
  commentsByPostId[req.params.id] = comments;
  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });
  // Send the response
  res.status(201).send(comments);
});

// Receive event from event bus
app.post('/events', async (req, res) => {
  // Get the type and data from the request body
  const { type, data } = req.body;
  // Check if the type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the comments from the commentsByPostId object
    const comments = commentsByPostId[data.postId];
    // Get the comment from the comments array
    const comment = comments.find((comment) => comment.id === data.id);
    // Update the status of the comment
    comment.status = data.status;
    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { ...comment, postId: data.postId },
    });
  }

