FROM amazonlinux:1

# node
RUN yum -y groupinstall 'Development Tools'
RUN curl --silent --location https://rpm.nodesource.com/setup_16.x | bash -
RUN yum -y install nodejs npm python27

# sharp
RUN npm i -g node-gyp

# serverless
RUN npm i -g serverless

# working directory
ADD ./ /microservices
WORKDIR /microservices/files
