use actix_web::{web, App, HttpResponse, HttpServer};
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Deserialize)]
struct RegisterVoterRequest {
    voter_address: String,
    stake: String,
    name: Option<String>,
}

#[derive(Serialize)]
struct ApiResponse {
    success: bool,
    message: String,
}

async fn register_voter(req: web::Json<RegisterVoterRequest>) -> HttpResponse {
    // Hardcode untuk sekarang
    let registry_chain = "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4";
    
    println!("Registering voter: {} with stake: {}", 
             req.voter_address, req.stake);
    
    // TODO: Actually execute operation
    // For now, just return success
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: format!("Voter {} registration initiated", req.voter_address),
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting Oracle Backend on http://localhost:3001");
    
    HttpServer::new(|| {
        App::new()
            .route("/api/register-voter", web::post().to(register_voter))
    })
    .bind(("127.0.0.1", 3001))?
    .run()
    .await
}
