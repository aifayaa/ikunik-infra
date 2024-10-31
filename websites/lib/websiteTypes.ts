import { ObjectID } from '@libs/mongoClient';

type WebsiteEBWordpressExternalDnsType =
  | {}
  | {
      zoneId: '/hostedzone/Z0110610SNTFXVJEUI67';
      ns: [
        'ns-1845.awsdns-38.co.uk',
        'ns-363.awsdns-45.com',
        'ns-595.awsdns-10.net',
        'ns-1440.awsdns-52.org',
      ];
      to: 'd102s1ctosc33v.cloudfront.net';
    };

export type WebsiteEBWordpressType = {
  _id: ObjectID;
  appId: string;
  name: string;
  type: 'eb/wordpress';
  dns: {
    internal: {
      zoneId: string;
      name: string;
      to: string;
    };
    external: WebsiteEBWordpressExternalDnsType;
  };
  deployed: boolean;
  created: boolean;
  finalizing?: boolean;
  finalized?: boolean;
  ssl?: {
    certificateArn: string;
    domains: string[];
    validated: boolean;
  };
  cloudFront?: {
    id: string;
    arn: string;
    domain: string;
  };
};

export type WebsiteKubernetesV1Type = {
  _id: string;
  createdAt: Date;
  createdBy: string;
  type: 'kubernetes/v1';
  template: string;
  name: string;
  domains: string[];
  appId: string;
  database?: {
    host: string;
    port: number;
    name: string;
    user: string;
  };
};

export type WebsiteType = WebsiteEBWordpressType | WebsiteKubernetesV1Type;
