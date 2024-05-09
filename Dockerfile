# Use the official Node.js image with version 18.18.0 as base
FROM node:18.18.0

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port where the React app will run
EXPOSE 3000

# Start the React app
CMD ["npm", "start"]
