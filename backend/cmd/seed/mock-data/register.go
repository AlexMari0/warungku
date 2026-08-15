package mockdata

import "warungku-backend/internal/seedcore"

// RegisterAll registers all available mock scenarios to the runner.
func RegisterAll(runner *seedcore.Runner) {
	runner.Register(&ScenarioWarungSukses{})
	runner.Register(&ScenarioWarungKosong{})
	// add more scenarios here
}
