#!/bin/bash

# ASAgents Platform - Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="."
BACKEND_DIR="./server"
BUILD_DIR="./dist"
BACKUP_DIR="./backups"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Frontend dependencies
    log_info "Installing frontend dependencies..."
    npm install
    
    # Backend dependencies
    log_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    cd ..
    
    log_success "Dependencies installed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Frontend tests
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        log_info "Running frontend tests..."
        npm test -- --run --reporter=verbose
    fi
    
    # Backend tests
    if [ -f "$BACKEND_DIR/package.json" ] && grep -q '"test"' "$BACKEND_DIR/package.json"; then
        log_info "Running backend tests..."
        cd "$BACKEND_DIR"
        npm test
        cd ..
    fi
    
    log_success "Tests completed"
}

# Build frontend
build_frontend() {
    log_info "Building frontend for production..."
    
    # Set production environment
    export NODE_ENV=production
    
    # Copy production environment file
    if [ -f ".env.production" ]; then
        cp .env.production .env.local
        log_info "Production environment configured"
    fi
    
    # Build the application
    npm run build
    
    # Verify build
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "Build failed - dist directory not found"
        exit 1
    fi
    
    log_success "Frontend build completed"
}

# Build backend
build_backend() {
    log_info "Building backend for production..."
    
    cd "$BACKEND_DIR"
    
    # Set production environment
    export NODE_ENV=production
    
    # Copy production environment file
    if [ -f ".env.production" ]; then
        cp .env.production .env
        log_info "Backend production environment configured"
    fi
    
    # Build if TypeScript
    if [ -f "tsconfig.json" ]; then
        npm run build
    fi
    
    cd ..
    log_success "Backend build completed"
}

# Setup database
setup_database() {
    log_info "Setting up production database..."
    
    cd "$BACKEND_DIR"
    
    # Run production setup script
    if [ -f "scripts/production-setup.js" ]; then
        node scripts/production-setup.js
    else
        log_warning "Production setup script not found, skipping database setup"
    fi
    
    cd ..
    log_success "Database setup completed"
}

# Create deployment package
create_deployment_package() {
    log_info "Creating deployment package..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Create timestamp
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    PACKAGE_NAME="asagents_deployment_$TIMESTAMP.tar.gz"
    
    # Create deployment package
    tar -czf "$BACKUP_DIR/$PACKAGE_NAME" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.env.local \
        --exclude=.env \
        --exclude=logs \
        --exclude=temp \
        --exclude=uploads \
        dist/ \
        server/ \
        package.json \
        .env.production \
        deploy.sh
    
    log_success "Deployment package created: $BACKUP_DIR/$PACKAGE_NAME"
}

# Deploy to Vercel (Frontend)
deploy_to_vercel() {
    log_info "Deploying frontend to Vercel..."
    
    if command -v vercel &> /dev/null; then
        # Set production environment variables in Vercel
        vercel env add VITE_API_URL production
        vercel env add VITE_GEMINI_API_KEY production
        vercel env add VITE_GOOGLE_CLIENT_ID production
        
        # Deploy
        vercel --prod
        log_success "Frontend deployed to Vercel"
    else
        log_warning "Vercel CLI not found. Please install with: npm i -g vercel"
    fi
}

# Deploy to Railway (Backend)
deploy_to_railway() {
    log_info "Deploying backend to Railway..."
    
    if command -v railway &> /dev/null; then
        cd "$BACKEND_DIR"
        railway up
        cd ..
        log_success "Backend deployed to Railway"
    else
        log_warning "Railway CLI not found. Please install with: npm i -g @railway/cli"
    fi
}

# Main deployment function
main() {
    echo "🚀 ASAgents Platform - Production Deployment"
    echo "============================================="
    
    # Parse command line arguments
    SKIP_TESTS=false
    SKIP_DATABASE=false
    DEPLOY_PLATFORM=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-database)
                SKIP_DATABASE=true
                shift
                ;;
            --platform)
                DEPLOY_PLATFORM="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_prerequisites
    install_dependencies
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    fi
    
    build_frontend
    build_backend
    
    if [ "$SKIP_DATABASE" = false ]; then
        setup_database
    fi
    
    create_deployment_package
    
    # Platform-specific deployment
    case $DEPLOY_PLATFORM in
        vercel)
            deploy_to_vercel
            ;;
        railway)
            deploy_to_railway
            ;;
        both)
            deploy_to_vercel
            deploy_to_railway
            ;;
        *)
            log_info "No deployment platform specified. Package created for manual deployment."
            ;;
    esac
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Verify your application is running correctly"
    echo "2. Test all critical functionality"
    echo "3. Monitor logs for any issues"
    echo "4. Update DNS records if needed"
    echo ""
}

# Run main function
main "$@"
