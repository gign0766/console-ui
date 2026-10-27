import { Organization } from './organization';
import { getUserOrganization, User } from './user';

const org = (id: string, name = id) => ({ id, name }) as Organization;
const user = (personalOrg: Organization[], guestOrg: Organization[] | null) =>
  ({ personalOrg, guestOrg }) as unknown as User;

describe('getUserOrganization', () => {
  it('should list personal organizations before guest ones, each sorted by name', () => {
    const result = getUserOrganization(user([org('p2', 'Zeta'), org('p1', 'alpha')], [org('g2', 'beta'), org('g1', 'Aaa')]));

    expect(result.map(o => o.id)).toEqual(['p1', 'p2', 'g1', 'g2']);
  });

  it('should sort names case-insensitively and compare numbers by value', () => {
    const result = getUserOrganization(user([org('a', 'org10'), org('b', 'Org2'), org('c', 'org1')], []));

    expect(result.map(o => o.name)).toEqual(['org1', 'Org2', 'org10']);
  });

  it('should keep an organization present in both lists once, as personal', () => {
    const result = getUserOrganization(user([org('shared', 'zzz')], [org('shared', 'zzz'), org('g', 'aaa')]));

    expect(result.map(o => o.id)).toEqual(['shared', 'g']);
  });

  it('should handle a missing guest list', () => {
    expect(getUserOrganization(user([org('p')], null)).map(o => o.id)).toEqual(['p']);
  });

  it('should not reorder the user arrays', () => {
    const personal = [org('b'), org('a')];
    getUserOrganization(user(personal, []));

    expect(personal.map(o => o.id)).toEqual(['b', 'a']);
  });
});
