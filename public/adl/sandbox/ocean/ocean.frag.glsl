

#define PI 3.1415926535897932384626433832795

uniform vec3 ambientLightColor;
#if MAX_DIR_LIGHTS > 0
uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];
uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];
#endif
#if MAX_HEMI_LIGHTS > 0
uniform vec3 hemisphereLightSkyColor[ MAX_HEMI_LIGHTS ];
uniform vec3 hemisphereLightGroundColor[ MAX_HEMI_LIGHTS ];
uniform vec3 hemisphereLightDirection[ MAX_HEMI_LIGHTS ];
#endif
#if MAX_POINT_LIGHTS > 0
uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];
uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];
uniform float pointLightDistance[ MAX_POINT_LIGHTS ];
#endif
#if MAX_SPOT_LIGHTS > 0
uniform vec3 spotLightColor[ MAX_SPOT_LIGHTS ];
uniform vec3 spotLightPosition[ MAX_SPOT_LIGHTS ];
uniform vec3 spotLightDirection[ MAX_SPOT_LIGHTS ];
uniform float spotLightAngleCos[ MAX_SPOT_LIGHTS ];
uniform float spotLightExponent[ MAX_SPOT_LIGHTS ];
uniform float spotLightDistance[ MAX_SPOT_LIGHTS ];
#endif
#if MAX_SPOT_LIGHTS > 0 || defined( USE_BUMPMAP ) || defined( USE_ENVMAP )|| defined( USE_NORMALMAP )
varying vec3 vWorldPosition;
#endif
#ifdef WRAP_AROUND
uniform vec3 wrapRGB;
#endif



varying vec3 vSundir;
varying vec3 vNormal;
varying vec3 vCamDir;
varying vec3 texcoord0;
varying mat3 TBN;
varying float vCamLength;
varying float h;
varying vec3 vViewPosition;

float nSnell = 1.34;
float kD = .91;
vec3 upwelling = vec3(0.2, 0.4, 0.6);
vec3 sky = vec3(0.69, 0.84, 1.0);
vec3 air = vec3(0.1, 0.1, 0.1);

uniform float L[numWaves];
uniform float A[numWaves];
uniform float S[numWaves];
uniform vec2 D[numWaves];

uniform float uMag;
uniform float t;
uniform samplerCube texture;
uniform sampler2D oNormal;
uniform sampler2D diffuse;
uniform float uChop;
uniform float uReflectPow;
uniform float uFoam;
uniform vec4 waves[9];
uniform float uHalfGrid;
uniform float uAmbientPower;
uniform float uSunPower;
uniform float uOceanDepth;

//physical params
uniform vec3 c;
uniform vec3 bb;
uniform vec3 a;
uniform vec3 Kd;

uniform float waveEffectDepth;



void main() {

	vec3 tc = texcoord0;
	vec3 pNormal;
	vec3 nnvCamDir = normalize(-vCamDir);
	float powerSum = 0.0;
	for (int i = 0; i < 2; i++)
	{
		{
			float wavesInTexture = 10.0;
			vec2 texToWorld = tc.xy/wavesInTexture;
			vec2 texToWaveLen =  texToWorld / L[i];
			vec2 directionAndSpeed = D[i] * S[i]/( wavesInTexture*10.0 );
			pNormal +=  A[i]*  texture2D(oNormal, texToWaveLen  + directionAndSpeed * t ).xyz;
			powerSum += A[i];
		}
	}

	pNormal /= powerSum;
	pNormal = 2.0 * pNormal.xyz - 1.0;

	float t1 = 0.02 * -t;
	float t2 = 0.015 * t;
	float t3 = 0.05 * t;

	vec2 uv1 = (tc.xy / waves[0].x) + t1;
	vec2 uv2 = (tc.xy / (waves[0].x*2.0)) + t2;
	vec2 uv3 = (tc.xy / waves[0].x) + t3;


	vec3 mapNormal = texture2D(oNormal, uv1).rgb + texture2D(oNormal, uv2).rgb;//+ texture2D(oNormal, uv3).rgb;
	vec3 diffuseTex = texture2D(diffuse, uv1).rgb + texture2D(diffuse, uv2).rgb;// + texture2D(diffuse, uv4).rgb;

	mapNormal /= 2.0;
	mapNormal = 2.0 * mapNormal.xyz - 1.0;
	mapNormal.xy *= max(0.0, uChop/30.0 *  waves[0].x);

	pNormal.xy *= max(0.0, uChop / 4.0);
	pNormal = normalize(pNormal);

	vec3 texNormal =  normalize(TBN * mapNormal);
	vec3 texNormal1 =  pNormal;

	texNormal = mix(texNormal, texNormal1, clamp(0.0, 1.0, vCamLength / uHalfGrid));
	texNormal = normalize(texNormal); 

	


	float ref = 0.0;
	


	float ndotl = max(0.00, dot(directionalLightDirection[ 0], texNormal));
	vec3 sunReflectVec = reflect(-directionalLightDirection[ 0], vec3(texNormal.x,texNormal.y,texNormal.z));
	sunReflectVec = normalize(sunReflectVec);
	float spec = pow(max(0.0,dot(nnvCamDir, sunReflectVec)), 32.0);


	float fresnel = max(0.0,min(1.0,.02 + 0.97 * pow(1.0-dot(texNormal,nnvCamDir),5.0)));


	float scatter = 1.0 - dot( texNormal, nnvCamDir);
	

	
	ref = fresnel;
	vec3 camdir = vCamDir;

	//ref = min(1.0, ref);

	float dist = 0.3;
	vec3 ref_vec = reflect(-camdir, texNormal);
	ref_vec = mix(-ref_vec, ref_vec, sign(ref_vec.z));
	sky = uReflectPow * textureCube(texture, ref_vec).xyz;
	
	



	//float ndotl = max(0.00, dot(directionalLightDirection[ 0], texNormal));


	float cosT  = -dot(vNormal,refract(nnvCamDir,normalize(vNormal),.66));
	float cosT2  = -dot(vNormal,refract(nnvCamDir,normalize(vNormal),1.03));
	//cosT = max(.001,cosT);
	cosT = -cosT;
	vec3 ocean_bottom_color = vec3(.5,.5,.5);
	vec3 LZTP = ocean_bottom_color;

	float Z = max(0.04,uOceanDepth * (1.0 + cosT2) - h*waveEffectDepth);//depth
	float R = -Z*cosT;

	

	vec3 Ldf0_sum = vec3(0.0,0.0,0.0);
	vec3 Ldf0 = vec3(0.0,0.0,0.0);
	
	/*float b0 = 0.037;

	float Kd_r =  36.0; //645nm
	float Kd_g =  3.4;  //510nm
	float Kd_b =  1.9;      //440nm

	float wl0 = 514.0;
	float m = -0.00113;
	float i = -1.62517;
	float b645 = b0+((645.0*m+i)/(wl0*m+i));
	float b510 = b0+((510.0*m+i)/(wl0*m+i));
	float b440 = b0+((440.0*m+i)/(wl0*m+i));

	float bb645 = 0.01829*b645 + 0.00006;
	float bb510 = 0.01829*b510 + 0.00006;
	float bb440 = 0.01829*b440 + 0.00006;

	float a645 = Kd_r;
	float a510 = Kd_g;
	float a440 = Kd_b;

	float c645 = a645 + b645;
	float c510 = a510 + b510;
	float c440 = a440 + b440;*/

	vec3 ed0 =  vec3(ndotl) * directionalLightColor[0]*uSunPower + (ambientLightColor)*uAmbientPower; //sun plus sky lighting on water surface
	
	Ldf0.r = ((0.33*bb[0])/a[0]) * (ed0.r/PI);
	Ldf0.g = ((0.33*bb[1])/a[1]) * (ed0.g/PI);
	Ldf0.b = ((0.33*bb[2])/a[2]) * (ed0.b/PI);


	Ldf0_sum.r = Ldf0.r*(1.0-exp((-c[0]+Kd[0]*cosT)*R));
	Ldf0_sum.g = Ldf0.g*(1.0-exp((-c[1]+Kd[1]*cosT)*R));
	Ldf0_sum.b = Ldf0.b*(1.0-exp((-c[2]+Kd[2]*cosT)*R));

	vec3 LZTP_sum = vec3(0.0,0.0,0.0);

	LZTP_sum.r = LZTP.r * exp(-c[0]*R); 
	LZTP_sum.g = LZTP.g * exp(-c[1]*R); 
	LZTP_sum.b = LZTP.b * exp(-c[2]*R); 

	vec3 L0TP = LZTP_sum +   Ldf0_sum; 


	vec4 water  =  vec4(mix(L0TP,sky,ref),1.0);
	water += vec4(directionalLightColor[ 0 ], 1.0) * spec;

	vec4 foam = vec4(1.0, 1.0, 1.0, 1.0) * ndotl + vec4(ambientLightColor, 1.0);;
	foam.a = 1.0;

	float foamMix = max(0.0, h * diffuseTex.r) ;
	gl_FragColor = mix(water, foam, clamp(foamMix * uFoam, 0.0, 1.0));
	

//	vec3 vsNormal = (viewMatrix * vec4(vNormal , 0.0)).xyz;
	//gl_FragColor = vec4(L0TP.r,L0TP.g,L0TP.b,1.0);
	float eyedot = dot(vNormal,nnvCamDir);
	eyedot =  clamp(0.0,1.0,eyedot);
	//gl_FragColor.xyz = vec3(ref).xyz ; 
}