# Welcome to your Customer 360 CDK project

This project will deploy the following architecture components in your account

![customer 360](./customer360.png)

### To get started clone this repo into your local directory

```
git clone git@github.com:sathishc/customer360.git
```

### Configure your aws profile to point to the us-west2 region

This project uses some resources (AMIs) that are only available in us-west-2 hence you need to create this project in that geo

### Install the necessary node modules and bootstrap the CDK

```
npm install
cdk boostrap
```

### Deploy the components

```
cdk deploy
```

