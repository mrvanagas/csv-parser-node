# Requirements:

Node js, docker, aws s3 bucket connection.

# How to start:
1. Set up environment variables according to the `.env.example` file
2. run npm install to install the packages
3. create empty `data` folder in root directory and store `artists.csv` and `tracks.csv`
4. run `docker compose up -d` to initialize the postgresql database in Docker detatched mode
5. run `npm run build` command to build the application.
6. run `npm start` to start the script
7. If the script running has shown no errors, double check in database to see if the data has been loaded.

## Available scripts
- `npm run build`: compiles the script
- `npm start`: runs the compiled app
- `npm test`: runs all of the tests in Jest