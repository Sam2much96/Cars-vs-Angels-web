/**
 * 
 * Enemy:
 * 
 * (1) An enemy script with a state machine, a shphere and glow shader whose job is to follow the player
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Enemy states
enum EnemyState {
  IDLE = 'IDLE',
  PATROL = 'PATROL',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  STUNNED = 'STUNNED'
}

interface EnemyConfig {
  position: THREE.Vector3;
  radius?: number;
  speed?: number;
  chaseDistance?: number;
  attackDistance?: number;
  glowColor?: THREE.Color;
  glowIntensity?: number;
}


export class Enemy {
    // Visual components
  private mesh: THREE.Mesh;
  private glowMesh: THREE.Mesh;
  
  // Physics
  private body: CANNON.Body;
  private world: CANNON.World;
  
  // State machine
  private state: EnemyState = EnemyState.IDLE;
  private previousState: EnemyState = EnemyState.IDLE;
  
  // Properties
  private speed: number = 10;
  private chaseDistance: number;
  private attackDistance: number;
  private radius: number;
  
  // Target
  //private target: THREE.Vector3 | null = null;
  private patrolPoints: THREE.Vector3[] = [];
  private currentPatrolIndex: number = 0;
  
  // Animation
  private glowPulseTime: number = 0;
  private glowIntensity: number;

  constructor(scene: THREE.Scene,
    world: CANNON.World,
    config: EnemyConfig){

            this.world = world;
    this.radius = config.radius || 1;
    this.speed = config.speed || 5;
    this.chaseDistance = config.chaseDistance || 20;
    this.attackDistance = config.attackDistance || 3;
    this.glowIntensity = config.glowIntensity || 2;

        // Create visual sphere
    this.mesh = this.createEnemyMesh(config.glowColor || new THREE.Color(0xff0000));
    this.mesh.position.copy(config.position);
    scene.add(this.mesh);

        // Create glow effect
    this.glowMesh = this.createGlowMesh(config.glowColor || new THREE.Color(0xff0000));
    this.mesh.add(this.glowMesh);
    
    // Create physics body
    this.body = this.createPhysicsBody(config.position);
    world.addBody(this.body);
    
    // Generate patrol points
    this.generatePatrolPoints(config.position);

  }


   /**
   * Creates the main enemy mesh with custom shader material
   */
  private createEnemyMesh(color: THREE.Color): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    
    // Custom shader material for glowing effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: color },
        uGlowIntensity: { value: this.glowIntensity }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uGlowIntensity;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Fresnel effect for edge glow
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
          
          // Pulsing effect
          float pulse = sin(uTime * 2.0) * 0.3 + 0.7;
          
          // Combine effects
          vec3 glow = uColor * (fresnel * uGlowIntensity * pulse + 0.3);
          
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    return new THREE.Mesh(geometry, material);
  }

  /**
   * Creates an outer glow mesh
   */
  private createGlowMesh(color: THREE.Color): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.radius * 1.3, 32, 32);
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uIntensity: { value: 0.5 }
      },
      vertexShader: `
        varying vec3 vNormal;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        
        varying vec3 vNormal;
        
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 glow = uColor * intensity * uIntensity;
          gl_FragColor = vec4(glow, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    
    return new THREE.Mesh(geometry, material);
  }

    
  /**
   * Creates the physics body for collision detection
   */
  private createPhysicsBody(position: THREE.Vector3): CANNON.Body {
    const shape = new CANNON.Sphere(this.radius);
    const body = new CANNON.Body({
      mass: 10,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.3,
      angularDamping: 0.3,
      material: new CANNON.Material({ friction: 0.1, restitution: 0.5 })
    });
    
    // Add collision event listener
    body.addEventListener('collide', (event: any) => {
      this.onCollision(event);
    });
    
    return body;
  }


  /**
   * Generates random patrol points around the spawn position
   */
  private generatePatrolPoints(center: THREE.Vector3): void {
    const numPoints = 4;
    const radius = 15;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const z = center.z + Math.sin(angle) * radius;
      this.patrolPoints.push(new THREE.Vector3(x, center.y, z));
    }
  }


  /**
   * State machine update
   */
  public update(deltaTime: number, playerPosition?: THREE.Vector3): void {
    // Update glow animation
    //this.updateGlow(deltaTime);
    
    // Calculate distance to player
    let distanceToPlayer = Infinity;
    if (playerPosition) {
      const enemyPos = new THREE.Vector3(
        this.body.position.x,
        this.body.position.y,
        this.body.position.z
      );
      distanceToPlayer = enemyPos.distanceTo(playerPosition);
    }
    
    // State transitions
    this.updateState(distanceToPlayer, playerPosition);
    
    // Execute state behavior
    //this.executeState(deltaTime, playerPosition);
    
    // Sync mesh with physics body
    this.mesh.position.copy(this.body.position as any);
    this.mesh.quaternion.copy(this.body.quaternion as any);
  }

  /**
   * Updates the state machine
   */
  private updateState(distanceToPlayer: number, playerPosition?: THREE.Vector3): void {
    this.previousState = this.state;
    
    switch (this.state) {
      case EnemyState.IDLE:
        if (playerPosition && distanceToPlayer < this.chaseDistance) {
          this.state = EnemyState.CHASE;
        } else {
          this.state = EnemyState.PATROL;
        }
        break;
        
      case EnemyState.PATROL:
        if (playerPosition && distanceToPlayer < this.chaseDistance) {
          this.state = EnemyState.CHASE;
        }
        break;
        
      case EnemyState.CHASE:
        if (distanceToPlayer < this.attackDistance) {
          this.state = EnemyState.ATTACK;
        } else if (distanceToPlayer > this.chaseDistance * 1.5) {
          this.state = EnemyState.PATROL;
        }
        break;
        
      case EnemyState.ATTACK:
        if (distanceToPlayer > this.attackDistance * 1.2) {
          this.state = EnemyState.CHASE;
        }
        break;
        
      case EnemyState.STUNNED:
        // Will be handled by stun timer
        break;
    }
    
    // On state change
    if (this.state !== this.previousState) {
      this.onStateEnter(this.state);
    }
  }

    /**
   * Called when entering a new state
   */
  private onStateEnter(state: EnemyState): void {
    console.log(`Enemy entering state: ${state}`);
    
    // Update glow color/intensity based on state
    const material = this.mesh.material as THREE.ShaderMaterial;
    
    switch (state) {
      case EnemyState.CHASE:
        material.uniforms.uColor.value = new THREE.Color(0xff4400); // Orange
        material.uniforms.uGlowIntensity.value = 2.5;
        break;
      case EnemyState.ATTACK:
        material.uniforms.uColor.value = new THREE.Color(0xff0000); // Red
        material.uniforms.uGlowIntensity.value = 3.0;
        break;
      case EnemyState.STUNNED:
        material.uniforms.uColor.value = new THREE.Color(0x4444ff); // Blue
        material.uniforms.uGlowIntensity.value = 1.0;
        break;
      default:
        material.uniforms.uColor.value = new THREE.Color(0xff0000); // Default red
        material.uniforms.uGlowIntensity.value = 2.0;
    }
  }
  

   
  /**
   * Handles collision events
   */
  private onCollision(event: any): void {
    const contactBody = event.body;
    
    // Check if collided with player
    if (contactBody.userData && contactBody.userData.isPlayer) {
      console.log('Enemy hit player!');
      // Apply damage to player or trigger game event
    }
    
    // Add impact force or bounce effect
    const impactStrength = event.contact.getImpactVelocityAlongNormal();
    if (impactStrength > 5) {
      // Strong collision, could trigger stun or special effect
      console.log('Strong impact:', impactStrength);
    }
  }

    /**
   * Updates the glow effect
   */
  private updateGlow(deltaTime: number): void {
    this.glowPulseTime += deltaTime;
    
    const material = this.mesh.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = this.glowPulseTime;
    
    // Rotate glow mesh for extra effect
    this.glowMesh.rotation.y += deltaTime * 0.5;
  }
  

   /**
   * Moves the enemy towards a target position
   */
  private moveTowards(target: THREE.Vector3, speed: number, deltaTime: number): void {
    const currentPos = new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
    
    const direction = new THREE.Vector3()
      .subVectors(target, currentPos)
      .normalize();
    
    // Apply force in direction of target
    const force = new CANNON.Vec3(
      direction.x * speed * 100,
      0,
      direction.z * speed * 100
    );
    
    this.body.applyForce(force, this.body.position);
    
    // Limit velocity
    const maxVelocity = speed;
    const vel = this.body.velocity;
    const horizontalSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    
    if (horizontalSpeed > maxVelocity) {
      const scale = maxVelocity / horizontalSpeed;
      this.body.velocity.x *= scale;
      this.body.velocity.z *= scale;
    }
  }

}

