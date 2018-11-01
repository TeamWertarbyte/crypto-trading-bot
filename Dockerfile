FROM node:8

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

ARG SOURCE_COMMIT
ENV SOURCE_COMMIT $SOURCE_COMMIT

#EXPOSE 8080
RUN npm run build
CMD [ "npm", "start" ]
