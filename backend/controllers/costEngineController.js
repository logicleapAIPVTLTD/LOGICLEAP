// backend/controllers/costEngineController.js
const axios = require("axios");

// Python cost engine service URL
const COST_ENGINE_URL = process.env.COST_ENGINE_URL || "http://localhost:8001";

class CostEngineController {
  /**
   * Get cost estimate for a project
   * POST /api/cost-engine/estimate
   */
  async getCostEstimate(req, res) {
    try {
      const payload = req.body;

      // Validate required fields
      if (!payload.state_tier) {
        return res.status(400).json({
          success: false,
          message: "state_tier is required",
        });
      }

      if (
        !payload.boq_items ||
        !Array.isArray(payload.boq_items) ||
        payload.boq_items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "boq_items array is required and must not be empty",
        });
      }

      // Validate BOQ items structure
      for (const boq of payload.boq_items) {
        if (!boq.boq_id || !boq.boq_name || !boq.bom_items) {
          return res.status(400).json({
            success: false,
            message: "Each BOQ item must have boq_id, boq_name, and bom_items",
          });
        }

        if (!Array.isArray(boq.bom_items) || boq.bom_items.length === 0) {
          return res.status(400).json({
            success: false,
            message: `BOQ ${boq.boq_id} must have at least one BOM item`,
          });
        }

        for (const bom of boq.bom_items) {
          if (!bom.item_name || bom.quantity === undefined) {
            return res.status(400).json({
              success: false,
              message: "Each BOM item must have item_name and quantity",
            });
          }
        }
      }

      // Call Python cost engine service
      const response = await axios.post(
        `${COST_ENGINE_URL}/cost-estimate`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 60000, // 60 second timeout for complex calculations
        }
      );

      return res.status(200).json({
        success: true,
        message: "Cost estimate calculated successfully",
        data: response.data,
      });
    } catch (error) {
      console.error("Error getting cost estimate:", error.message);

      if (error.response) {
        // Python service returned an error
        const status = error.response.status;
        const errorMessage =
          error.response.data.detail || "Error from cost engine service";

        return res.status(status).json({
          success: false,
          message: errorMessage,
          error: error.response.data,
        });
      } else if (error.code === "ECONNREFUSED") {
        return res.status(503).json({
          success: false,
          message: "Cost engine service is unavailable",
        });
      } else if (error.code === "ETIMEDOUT") {
        return res.status(504).json({
          success: false,
          message: "Cost calculation timed out",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Get cost estimate with additional processing
   * POST /api/cost-engine/estimate/detailed
   */
  async getDetailedEstimate(req, res) {
    try {
      const payload = req.body;

      // Call cost engine
      const response = await axios.post(
        `${COST_ENGINE_URL}/cost-estimate`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 60000,
        }
      );

      const estimate = response.data;

      // Add additional processing/metadata
      const enhancedData = {
        ...estimate,
        metadata: {
          calculated_at: new Date().toISOString(),
          request_id:
            req.headers["x-request-id"] || require("crypto").randomUUID(),
          state_tier: payload.state_tier,
          total_boq_items: payload.boq_items.length,
          total_bom_items: payload.boq_items.reduce(
            (sum, boq) => sum + boq.bom_items.length,
            0
          ),
        },
        summary: {
          estimated_range: {
            min: estimate.project_cost.overall.min,
            max: estimate.project_cost.overall.max,
            difference:
              estimate.project_cost.overall.max -
              estimate.project_cost.overall.min,
          },
          cost_breakdown_pct: {
            material: estimate.explainability.material_share_pct,
            labour: estimate.explainability.labour_share_pct,
            machinery:
              100 -
              estimate.explainability.material_share_pct -
              estimate.explainability.labour_share_pct,
          },
        },
      };

      return res.status(200).json({
        success: true,
        message: "Detailed cost estimate calculated successfully",
        data: enhancedData,
      });
    } catch (error) {
      console.error("Error getting detailed estimate:", error.message);

      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          message:
            error.response.data.detail || "Error from cost engine service",
          error: error.response.data,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  /**
   * Batch cost estimation
   * POST /api/cost-engine/estimate/batch
   */
  async batchCostEstimate(req, res) {
    try {
      const { estimates } = req.body;

      if (!Array.isArray(estimates) || estimates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "estimates array is required and must not be empty",
        });
      }

      // Process all estimates in parallel
      const results = await Promise.allSettled(
        estimates.map((payload) =>
          axios.post(`${COST_ENGINE_URL}/cost-estimate`, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 60000,
          })
        )
      );

      // Format results
      const formattedResults = results.map((result, index) => {
        if (result.status === "fulfilled") {
          return {
            success: true,
            index,
            data: result.value.data,
          };
        } else {
          return {
            success: false,
            index,
            error:
              result.reason.response?.data?.detail || result.reason.message,
          };
        }
      });

      const successCount = formattedResults.filter((r) => r.success).length;
      const failureCount = formattedResults.length - successCount;

      return res.status(200).json({
        success: true,
        message: `Batch processing completed: ${successCount} succeeded, ${failureCount} failed`,
        summary: {
          total: formattedResults.length,
          succeeded: successCount,
          failed: failureCount,
        },
        results: formattedResults,
      });
    } catch (error) {
      console.error("Error in batch cost estimate:", error.message);

      return res.status(500).json({
        success: false,
        message: "Internal server error during batch processing",
        error: error.message,
      });
    }
  }

  /**
   * Health check for cost engine service
   * GET /api/cost-engine/health
   */
  async checkHealth(req, res) {
    try {
      const response = await axios.get(`${COST_ENGINE_URL}/`, {
        timeout: 5000,
      });

      return res.status(200).json({
        success: true,
        message: "Cost engine service is healthy",
        data: response.data,
      });
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: "Cost engine service is unavailable",
        error: error.message,
      });
    }
  }

  /**
   * Get service info/docs
   * GET /api/cost-engine/info
   */
  async getServiceInfo(req, res) {
    try {
      const response = await axios.get(`${COST_ENGINE_URL}/docs`, {
        timeout: 5000,
      });

      return res.status(200).json({
        success: true,
        data: {
          service: "Cost Engine API",
          version: "2.2",
          docs_url: `${COST_ENGINE_URL}/docs`,
          description:
            "AI Cost Engine with Deterministic Calculation and LLM Explainability",
        },
      });
    } catch (error) {
      return res.status(200).json({
        success: true,
        data: {
          service: "Cost Engine API",
          version: "2.2",
          description:
            "AI Cost Engine with Deterministic Calculation and LLM Explainability",
        },
      });
    }
  }
}

module.exports = new CostEngineController();
