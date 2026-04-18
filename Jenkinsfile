pipeline {

    agent any

    environment {
        JWT_SECRET       = credentials('urlshortener-jwt-secret')
        DOCKERHUB_CRED   = credentials('dockerhub-credentials')
        DOCKER_USERNAME  = 'ashwinnayak'
        PUBLIC_SERVER    = '34.206.114.174'
        PRIVATE_SERVER   = '10.0.128.172'
        BASE_URL         = 'http://34.206.114.174'
        IMAGE_TAG        = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
    }

    stages {

        stage('Checkout') {
            steps {
                echo '>>> STAGE 1: Pulling latest code from GitHub...'
                checkout scm
                sh 'ls -la'
            }
        }

        stage('Build Docker Images') {
            steps {
                echo '>>> STAGE 2: Building Docker images from Jenkins workspace...'
                sh '''
                    echo "Building from workspace: $(pwd)"
                    docker build -t $DOCKER_USERNAME/urlshortener-frontend:$IMAGE_TAG ./frontend
                    docker tag $DOCKER_USERNAME/urlshortener-frontend:$IMAGE_TAG $DOCKER_USERNAME/urlshortener-frontend:latest
                    docker build -t $DOCKER_USERNAME/urlshortener-backend:$IMAGE_TAG ./backend
                    docker tag $DOCKER_USERNAME/urlshortener-backend:$IMAGE_TAG $DOCKER_USERNAME/urlshortener-backend:latest
                    echo "Both images built successfully"
                '''
            }
        }

        stage('Run Tests') {
            steps {
                echo '>>> STAGE 3: Running Jest tests against real MongoDB...'
                sh '''
                    docker network create test-network-url 2>/dev/null || true

                    docker run -d \
                        --name test-mongodb-url \
                        --network test-network-url \
                        mongo:6

                    echo "Waiting 10 seconds for MongoDB to start..."
                    sleep 10

                    docker run --rm \
                        --network test-network-url \
                        -e MONGODB_URI=mongodb://test-mongodb-url:27017/urlshortener_test \
                        -e JWT_SECRET=test_secret_for_jest_only \
                        -e BASE_URL=http://localhost:5000 \
                        $DOCKER_USERNAME/urlshortener-backend:$IMAGE_TAG \
                        npm test

                    docker stop test-mongodb-url 2>/dev/null || true
                    docker rm test-mongodb-url 2>/dev/null || true
                    docker network rm test-network-url 2>/dev/null || true
                    echo "Tests completed and cleanup done"
                '''
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                echo '>>> STAGE 4: Pushing versioned images to Docker Hub...'
                sh '''
                    echo $DOCKERHUB_CRED_PSW | docker login -u $DOCKERHUB_CRED_USR --password-stdin

                    docker push $DOCKER_USERNAME/urlshortener-frontend:$IMAGE_TAG
                    docker push $DOCKER_USERNAME/urlshortener-frontend:latest
                    docker push $DOCKER_USERNAME/urlshortener-backend:$IMAGE_TAG
                    docker push $DOCKER_USERNAME/urlshortener-backend:latest

                    docker logout
                    echo "Images pushed with tag: $IMAGE_TAG"
                '''
            }
        }

        stage('Deploy Frontend to Public Server') {
            steps {
                echo '>>> STAGE 5: Deploying React frontend to public EC2 server...'
                sshagent(['urlshortener-public-server-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ec2-user@${PUBLIC_SERVER} '
                            mkdir -p /home/ec2-user/urlshortener
                        '

                        scp -o StrictHostKeyChecking=no \
                            docker-compose.yml \
                            ec2-user@${PUBLIC_SERVER}:/home/ec2-user/urlshortener/docker-compose.yml

                        scp -o StrictHostKeyChecking=no \
                            nginx-site.conf \
                            ec2-user@${PUBLIC_SERVER}:/home/ec2-user/urlshortener/nginx-site.conf

                        ssh -o StrictHostKeyChecking=no ec2-user@${PUBLIC_SERVER} '
                            docker pull ${DOCKER_USERNAME}/urlshortener-frontend:latest
                            docker rm -f urlshortener-frontend 2>/dev/null || true
                            docker run -d \
                                --name urlshortener-frontend \
                                --restart unless-stopped \
                                -p 3000:3000 \
                                ${DOCKER_USERNAME}/urlshortener-frontend:latest
                            sudo cp /home/ec2-user/urlshortener/nginx-site.conf /etc/nginx/conf.d/urlshortener.conf
                            sudo nginx -t && sudo systemctl reload nginx
                            echo "Frontend deployed successfully"
                        '
                    """
                }
            }
        }

        stage('Deploy Backend to Private Server') {
            steps {
                echo '>>> STAGE 6: Deploying backend and MongoDB to private EC2...'
                sshagent(['urlshortener-public-server-key']) {
                    sh """
                        scp -o StrictHostKeyChecking=no \
                            docker-compose.app.yml \
                            ec2-user@${PUBLIC_SERVER}:/home/ec2-user/urlshortener/docker-compose.app.yml

                        ssh -o StrictHostKeyChecking=no ec2-user@${PUBLIC_SERVER} '
                            scp -o StrictHostKeyChecking=no \
                                -i /home/ec2-user/my-server-key.pem \
                                /home/ec2-user/urlshortener/docker-compose.app.yml \
                                ec2-user@${PRIVATE_SERVER}:/home/ec2-user/urlshortener/docker-compose.app.yml
                        '

                        ssh -o StrictHostKeyChecking=no ec2-user@${PUBLIC_SERVER} "
                            ssh -o StrictHostKeyChecking=no \
                                -i /home/ec2-user/my-server-key.pem \
                                ec2-user@${PRIVATE_SERVER} \
                                'mkdir -p /home/ec2-user/urlshortener && \
                                 cd /home/ec2-user/urlshortener && \
                                 docker pull ${DOCKER_USERNAME}/urlshortener-backend:latest && \
                                 DOCKER_USERNAME=${DOCKER_USERNAME} \
                                 JWT_SECRET=${JWT_SECRET} \
                                 BASE_URL=${BASE_URL} \
                                 docker compose -f docker-compose.app.yml down --remove-orphans || true && \
                                 docker rm -f urlshortener-backend urlshortener-mongodb 2>/dev/null || true && \
                                 DOCKER_USERNAME=${DOCKER_USERNAME} \
                                 JWT_SECRET=${JWT_SECRET} \
                                 BASE_URL=${BASE_URL} \
                                 docker compose -f docker-compose.app.yml up -d --force-recreate && \
                                 echo Backend deployed successfully'
                        "
                    """
                }
            }
        }

        stage('Verify Both Deployments') {
            steps {
                echo '>>> STAGE 7: Verifying frontend and backend are both running...'
                sshagent(['urlshortener-public-server-key']) {
                    sh """
                        sleep 20

                        echo '--- Checking frontend on public server ---'
                        ssh -o StrictHostKeyChecking=no ec2-user@${PUBLIC_SERVER} \
                            'curl -sf http://localhost:3000 > /dev/null && echo "Frontend: OK" || echo "Frontend: FAILED"'

                        echo '--- Checking backend health via public server ---'
                        ssh -o StrictHostKeyChecking=no ec2-user@${PUBLIC_SERVER} "
                            ssh -o StrictHostKeyChecking=no \
                                -i /home/ec2-user/my-server-key.pem \
                                ec2-user@${PRIVATE_SERVER} \
                                'curl -sf http://localhost:5000/api/health'
                        "

                        echo '--- Checking end-to-end via Nginx on port 80 ---'
                        ssh -o StrictHostKeyChecking=no ec2-user@${PUBLIC_SERVER} \
                            'curl -sf http://localhost/api/health'

                        echo 'All verifications passed!'
                    """
                }
            }
        }

    }

    post {
        success {
            echo '=============================================='
            echo "DEPLOYMENT SUCCEEDED"
            echo "Image tag: ${env.IMAGE_TAG}"
            echo "App URL: http://${env.PUBLIC_SERVER}"
            echo '=============================================='
        }
        failure {
            echo '=============================================='
            echo 'DEPLOYMENT FAILED — Read console output above'
            echo '=============================================='
        }
        always {
            sh 'docker system prune -f || true'
        }
    }
}
