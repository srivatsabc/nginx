pipeline {

  environment {
     deploymemt_yaml = "nginx-deployment.yaml"
     k8s_namespace = "test"
     k8s_app = "nginx"
     APP_ID = "2239edcc-5162-4e06-8efa-a3bc31215679"
     SECRET = "70511941-dd86-4af6-ab6b-7525b4ce8260"
     TENANT = "4ea6445f-e804-4e09-96c0-4fe22644a40d"
   }

  agent {
      label "master"
  }

  stages {
      stage('Checkout') {
          steps {
            checkout([$class: 'GitSCM',
              branches: [[name: 'master']],
              doGenerateSubmoduleConfigurations: false,
              extensions: [[$class: 'SparseCheckoutPaths',  sparseCheckoutPaths:[[$class:'SparseCheckoutPath', path:'nginx/']]]                        ],
              submoduleCfg: [],
              userRemoteConfigs: [[credentialsId: 'srivatsabc_git_login', url: 'https://github.com/srivatsabc/nginx.git']]])

            sh "ls -lat"
          }
      }

     stage('az login') {
          steps {
            sh "az login --service-principal -u $APP_ID -p $SECRET --tenant $TENANT"
          }
      }

     stage('az aks get credentials nodes') {
          steps {
            sh "az aks get-credentials --resource-group k8s-RG --name k8s --output table"
          }
      }

      stage('Delete existing deployment') {
       steps {
         script{
           status = sh(returnStatus: true, script: "kubectl delete deployment $k8s_app --namespace=$k8s_namespace")
           if (status != 0){
             stage('No deployment to delete'){
               sh "echo no deployment to delete in kubernetes"
             }
           }else{
             stage('script') {
                 script {
                   statusDelete = sh(returnStatus: true, script: "kubectl delete service $k8s_app --namespace=$k8s_namespace")
                   if (statusDelete == 0){
                     sh "echo k8s deployments deleted successfully"
                   }else{
                     stage('No service to delete'){
                       sh "echo no service to delte in kubernetes"
                     }
                   }
                 }
             }
           }
         }
       }
     }

     stage('Kubernetes deployment') {
      steps {
        sh 'kubectl apply -n $k8s_namespace -f $application/$deploymemt_yaml'
      }
    }
  }
}
