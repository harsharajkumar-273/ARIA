from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from model.predict import predict_failures

app = FastAPI(title="ARIA ML Circuit Outage Prediction Service")

# Allow CORS for dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/predict")
async def get_predictions():
    predictions = predict_failures()
    return {"predictions": predictions, "model_version": "1.0"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ml-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
