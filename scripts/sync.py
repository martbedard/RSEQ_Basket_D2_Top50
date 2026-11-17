"""Une publication entière, ou conservation de la version précédente."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from tempfile import NamedTemporaryFile

from rseq import LEAGUE, ROOT, TEAMS, fetch, normalize, rank, require


def synchronize(destination, reader=fetch):
    teams, players, errors = [], [], []
    reference_games = None
    for team_id, name in TEAMS.items():
        try:
            data = reader(team_id)
            team, eligible = normalize(team_id, data)
            games = {s['TeamId']: s['GamesPlayed'] for s in data['Standings']
                     if s['SeasonType'] == 1 and s['LeagueId'] == LEAGUE}
            if reference_games is None:
                reference_games = games
            require(reference_games == games, 'classement modifié pendant la collecte')
            teams.append(team)
            players.extend(eligible)
            print(f"{name} : {team['games']} MJ, {len(eligible)} admissibles", flush=True)
        except Exception as error:
            errors.append(f'{name} ({team_id}) : {error}')
    require(not errors, '\n'.join(errors))
    require(len(teams) == 8 and players, 'jeu de données vide ou incomplet')
    result = dict(season='2026-2027', updated=datetime.now(timezone.utc).isoformat(timespec='seconds'),
                  teams=teams, players=rank(players))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(mode='w', dir=destination.parent, delete=False, encoding='utf-8') as tmp:
        json.dump(result, tmp, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    Path(tmp.name).replace(destination)
    print(f"{len(players)} admissibles • {result['updated']}")


if __name__ == '__main__':
    try:
        synchronize(ROOT / 'site/data.json')
    except Exception as exc:
        sys.exit(f'Actualisation interrompue : {exc}')
