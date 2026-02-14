"""
Task 7.2: Orquestación Completa (TDD)

- Docker networks are explicitly defined and attached to services
- Critical services have healthchecks
- Services use restart policy unless-stopped
"""

from pathlib import Path

import yaml


PROJECT_ROOT = Path(__file__).parent.parent


def load_docker_compose():
    with open(PROJECT_ROOT / "docker-compose.yml", "r") as f:
        return yaml.safe_load(f)


CRITICAL_SERVICES = [
    "db",
    "backend",
    "frontend",
    "telegram-bot",
    "scraper-practicas",
    "scraper-computrabajo",
]


class TestDockerComposeNetworks:
    def test_compose_defines_networks(self):
        config = load_docker_compose()
        assert "networks" in config, "docker-compose.yml should define top-level 'networks'"
        assert isinstance(config["networks"], dict) and config["networks"], "networks must be a non-empty mapping"
        assert "cronopus_net" in config["networks"], "Expected 'cronopus_net' network to be defined"

    def test_services_attached_to_cronopus_net(self):
        config = load_docker_compose()
        services = config.get("services", {})
        for name in CRITICAL_SERVICES:
            assert name in services, f"Missing service '{name}'"
            svc = services[name]
            assert "networks" in svc, f"Service '{name}' should declare networks"
            networks = svc["networks"]
            if isinstance(networks, dict):
                assert "cronopus_net" in networks, f"Service '{name}' must be attached to cronopus_net"
            else:
                assert "cronopus_net" in networks, f"Service '{name}' must be attached to cronopus_net"


class TestDockerComposeRestartPolicies:
    def test_services_use_unless_stopped(self):
        config = load_docker_compose()
        services = config.get("services", {})
        for name in CRITICAL_SERVICES:
            assert name in services, f"Missing service '{name}'"
            assert services[name].get("restart") == "unless-stopped", f"Service '{name}' must use restart: unless-stopped"


class TestDockerComposeHealthchecks:
    def test_backend_has_healthcheck(self):
        config = load_docker_compose()
        backend = config["services"]["backend"]
        assert "healthcheck" in backend, "backend should define a healthcheck"
        hc = backend["healthcheck"]
        for key in ["test", "interval", "timeout", "retries"]:
            assert key in hc, f"backend healthcheck missing '{key}'"

    def test_frontend_has_healthcheck(self):
        config = load_docker_compose()
        frontend = config["services"]["frontend"]
        assert "healthcheck" in frontend, "frontend should define a healthcheck"
        hc = frontend["healthcheck"]
        for key in ["test", "interval", "timeout", "retries"]:
            assert key in hc, f"frontend healthcheck missing '{key}'"

    def test_telegram_bot_has_healthcheck(self):
        config = load_docker_compose()
        bot = config["services"]["telegram-bot"]
        assert "healthcheck" in bot, "telegram-bot should define a healthcheck"
        hc = bot["healthcheck"]
        for key in ["test", "interval", "timeout", "retries"]:
            assert key in hc, f"telegram-bot healthcheck missing '{key}'"

